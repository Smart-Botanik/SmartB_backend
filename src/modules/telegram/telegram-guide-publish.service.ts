import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  buildHashtagFooter,
  extractTaxonomyTermsFromBody,
} from "@growing/content-markdown";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { TelegramBotService } from "./telegram-bot.service";

const TELEGRAM_MAX_LENGTH = 4096;

@Injectable()
export class TelegramGuidePublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
    private readonly configService: ConfigService,
  ) {}

  private getSiteBaseUrl(): string {
    const raw =
      this.configService.get<string>("PUBLIC_SITE_BASE_URL")?.trim() ||
      "https://smart-botanik.ru";
    return raw.replace(/\/$/, "");
  }

  private markdownToPlain(md: string): string {
    let text = md;
    text = text.replace(/!\[[^\]]*]\(media:\/\/[^)]+\)/g, "");
    text = text.replace(/!\[[^\]]*]\([^)]+\)/g, "");
    text = text.replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1: $2");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  }

  private buildDraftText(params: {
    title: string;
    excerpt?: string | null;
    bodySiteMd: string;
  }): string {
    const head = (params.bodySiteMd || "")
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/^#+\s+/gm, "")
      .slice(0, 400)
      .trim();
    const parts = [params.title];
    if (params.excerpt?.trim()) {
      parts.push(params.excerpt.trim());
    }
    if (head) {
      parts.push(head);
    }
    return parts.join("\n\n");
  }

  private buildFullArticleLink(slug: string): string {
    const url = `${this.getSiteBaseUrl()}/guides/${slug}`;
    return `\n\n📖 Полная статья: ${url}`;
  }

  async publishCropGuide(cropGuideId: string) {
    const guide = await this.prisma.cropGuide.findUnique({
      where: { id: cropGuideId },
      include: {
        coverMedia: true,
        taxonomyTags: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!guide) {
      throw new NotFoundException("CropGuide not found");
    }

    let text = "";
    if (guide.bodyTelegramMd.trim()) {
      text = this.markdownToPlain(guide.bodyTelegramMd.trim());
    } else {
      text = this.buildDraftText({
        title: guide.title,
        excerpt: guide.excerpt,
        bodySiteMd: guide.bodySiteMd,
      });
    }

    text += this.buildFullArticleLink(guide.slug);

    const hashtagTerms =
      guide.taxonomyTags.length > 0
        ? guide.taxonomyTags.map(label => ({
            key: label.key,
            label: label.label,
            sortOrder: label.sortOrder,
          }))
        : extractTaxonomyTermsFromBody(guide.body);

    text += buildHashtagFooter(hashtagTerms, { excludeInText: text });

    if (text.length > TELEGRAM_MAX_LENGTH) {
      throw new BadRequestException(
        `Текст для Telegram превышает ${TELEGRAM_MAX_LENGTH} символов (${text.length})`,
      );
    }

    const { messageId, postUrl } =
      await this.telegramBot.sendChannelMessage(text);
    const publishedAt = new Date();

    const updated = await this.prisma.cropGuide.update({
      where: { id: cropGuideId },
      data: {
        telegramPublishedAt: publishedAt,
        telegramMessageId: messageId,
        telegramPostUrl: postUrl,
      },
      include: {
        coverMedia: true,
        taxonomyTags: { orderBy: { sortOrder: "asc" } },
      },
    });

    return {
      success: true,
      message: "Опубликовано в Telegram",
      cropGuide: updated,
      telegramMessageId: messageId,
      telegramPostUrl: postUrl,
    };
  }
}
