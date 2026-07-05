import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 10;

@Injectable()
export class TelegramGuidePublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByGuideId(cropGuideId: string, limit = DEFAULT_LIMIT) {
    const take = Math.min(Math.max(limit, 1), MAX_LIMIT);

    return this.prisma.cropGuideTelegramPublication.findMany({
      where: { cropGuideId },
      orderBy: { publishedAt: "desc" },
      take,
      include: {
        channel: {
          include: { bot: true },
        },
      },
    });
  }

  async recordPublication(params: {
    cropGuideId: string;
    channelId?: string | null;
    botId?: string | null;
    channelName?: string | null;
    botName?: string | null;
    telegramMessageId: string;
    telegramPostUrl?: string | null;
    publishedAt?: Date;
  }) {
    return this.prisma.cropGuideTelegramPublication.create({
      data: {
        cropGuideId: params.cropGuideId,
        channelId: params.channelId ?? undefined,
        botId: params.botId ?? undefined,
        channelName: params.channelName ?? undefined,
        botName: params.botName ?? undefined,
        telegramMessageId: params.telegramMessageId,
        telegramPostUrl: params.telegramPostUrl ?? undefined,
        publishedAt: params.publishedAt ?? new Date(),
      },
      include: {
        channel: {
          include: { bot: true },
        },
      },
    });
  }
}
