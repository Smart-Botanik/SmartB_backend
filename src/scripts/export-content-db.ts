/**
 * One-time export from a **pre-cutover** monolith Postgres (content/telegram tables still present).
 * Target writes via content-service Prisma client (`CONTENT_DATABASE_URL`).
 *
 * Order: TelegramBot → TelegramChannel → CropGuide → CropGuideTaxonomyTag →
 * CropGuideTelegramPublication → SitePage
 */
import { PrismaClient } from "@prisma/client";
import { createContentPrisma } from "./content-prisma-for-migration";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

type TelegramBotRow = {
  id: string;
  name: string;
  tokenEncrypted: string;
  username: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TelegramChannelRow = {
  id: string;
  name: string;
  chatId: string;
  botId: string;
  isDefault: boolean;
  isActive: boolean;
  publicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CropGuideRow = {
  id: string;
  cropKind: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: unknown;
  bodySiteMd: string;
  bodyTelegramMd: string;
  coverMediaId: string | null;
  status: string;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  telegramPublishedAt: Date | null;
  telegramMessageId: string | null;
  telegramPostUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CropGuideTaxonomyTagRow = {
  cropGuideId: string;
  taxonomyTagId: string;
};

type CropGuideTelegramPublicationRow = {
  id: string;
  cropGuideId: string;
  channelId: string | null;
  botId: string | null;
  channelName: string | null;
  botName: string | null;
  telegramMessageId: string;
  telegramPostUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
};

type SitePageRow = {
  id: string;
  key: string;
  title: string;
  sections: unknown;
  status: string;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function queryTableOrWarn<T>(
  source: PrismaClient,
  label: string,
  query: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await query();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[db:export-content] ${label} not available — skipping (${reason})`,
    );
    return [];
  }
}

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("CONTENT_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = createContentPrisma(targetUrl);

  try {
    const bots = await queryTableOrWarn<TelegramBotRow>(
      source,
      "TelegramBot",
      () => source.$queryRaw<TelegramBotRow[]>`
        SELECT id, name, "tokenEncrypted", username, "isActive", "createdAt", "updatedAt"
        FROM "TelegramBot"
        ORDER BY name ASC
      `,
    );

    const channels = await queryTableOrWarn<TelegramChannelRow>(
      source,
      "TelegramChannel",
      () => source.$queryRaw<TelegramChannelRow[]>`
        SELECT id, name, "chatId", "botId", "isDefault", "isActive", "publicUrl",
          "createdAt", "updatedAt"
        FROM "TelegramChannel"
        ORDER BY name ASC
      `,
    );

    const guides = await queryTableOrWarn<CropGuideRow>(
      source,
      "CropGuide",
      () => source.$queryRaw<CropGuideRow[]>`
        SELECT id, "cropKind"::text AS "cropKind", slug, title, excerpt, body,
          "bodySiteMd", "bodyTelegramMd", "coverMediaId", status::text AS status,
          "publishedAt", "seoTitle", "seoDescription", "sortOrder",
          "telegramPublishedAt", "telegramMessageId", "telegramPostUrl",
          "createdAt", "updatedAt"
        FROM "CropGuide"
        ORDER BY "sortOrder" ASC, slug ASC
      `,
    );

    const taxonomyLinks = await queryTableOrWarn<CropGuideTaxonomyTagRow>(
      source,
      "CropGuideTaxonomyTag",
      () => source.$queryRaw<CropGuideTaxonomyTagRow[]>`
        SELECT "cropGuideId", "taxonomyTagId"
        FROM "CropGuideTaxonomyTag"
      `,
    );

    const publications =
      await queryTableOrWarn<CropGuideTelegramPublicationRow>(
        source,
        "CropGuideTelegramPublication",
        () => source.$queryRaw<CropGuideTelegramPublicationRow[]>`
          SELECT id, "cropGuideId", "channelId", "botId", "channelName", "botName",
            "telegramMessageId", "telegramPostUrl", "publishedAt", "createdAt"
          FROM "CropGuideTelegramPublication"
          ORDER BY "publishedAt" ASC
        `,
      );

    const pages = await queryTableOrWarn<SitePageRow>(
      source,
      "SitePage",
      () => source.$queryRaw<SitePageRow[]>`
        SELECT id, key, title, sections, status::text AS status, "publishedAt",
          "seoTitle", "seoDescription", "createdAt", "updatedAt"
        FROM "SitePage"
        ORDER BY key ASC
      `,
    );

    for (const bot of bots) {
      await target.telegramBot.upsert({
        where: { id: bot.id },
        create: {
          id: bot.id,
          name: bot.name,
          tokenEncrypted: bot.tokenEncrypted,
          username: bot.username,
          isActive: bot.isActive,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
        },
        update: {
          name: bot.name,
          tokenEncrypted: bot.tokenEncrypted,
          username: bot.username,
          isActive: bot.isActive,
          updatedAt: bot.updatedAt,
        },
      });
    }

    for (const channel of channels) {
      await target.telegramChannel.upsert({
        where: { id: channel.id },
        create: {
          id: channel.id,
          name: channel.name,
          chatId: channel.chatId,
          botId: channel.botId,
          isDefault: channel.isDefault,
          isActive: channel.isActive,
          publicUrl: channel.publicUrl,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
        },
        update: {
          name: channel.name,
          chatId: channel.chatId,
          botId: channel.botId,
          isDefault: channel.isDefault,
          isActive: channel.isActive,
          publicUrl: channel.publicUrl,
          updatedAt: channel.updatedAt,
        },
      });
    }

    for (const guide of guides) {
      // coverMediaId only — no Media FK in content_db
      await target.cropGuide.upsert({
        where: { id: guide.id },
        create: {
          id: guide.id,
          cropKind: guide.cropKind as never,
          slug: guide.slug,
          title: guide.title,
          excerpt: guide.excerpt,
          body: guide.body as never,
          bodySiteMd: guide.bodySiteMd,
          bodyTelegramMd: guide.bodyTelegramMd,
          coverMediaId: guide.coverMediaId,
          status: guide.status as never,
          publishedAt: guide.publishedAt,
          seoTitle: guide.seoTitle,
          seoDescription: guide.seoDescription,
          sortOrder: guide.sortOrder,
          telegramPublishedAt: guide.telegramPublishedAt,
          telegramMessageId: guide.telegramMessageId,
          telegramPostUrl: guide.telegramPostUrl,
          createdAt: guide.createdAt,
          updatedAt: guide.updatedAt,
        },
        update: {
          cropKind: guide.cropKind as never,
          slug: guide.slug,
          title: guide.title,
          excerpt: guide.excerpt,
          body: guide.body as never,
          bodySiteMd: guide.bodySiteMd,
          bodyTelegramMd: guide.bodyTelegramMd,
          coverMediaId: guide.coverMediaId,
          status: guide.status as never,
          publishedAt: guide.publishedAt,
          seoTitle: guide.seoTitle,
          seoDescription: guide.seoDescription,
          sortOrder: guide.sortOrder,
          telegramPublishedAt: guide.telegramPublishedAt,
          telegramMessageId: guide.telegramMessageId,
          telegramPostUrl: guide.telegramPostUrl,
          updatedAt: guide.updatedAt,
        },
      });
    }

    for (const link of taxonomyLinks) {
      await target.cropGuideTaxonomyTag.upsert({
        where: {
          cropGuideId_taxonomyTagId: {
            cropGuideId: link.cropGuideId,
            taxonomyTagId: link.taxonomyTagId,
          },
        },
        create: {
          cropGuideId: link.cropGuideId,
          taxonomyTagId: link.taxonomyTagId,
        },
        update: {},
      });
    }

    for (const pub of publications) {
      await target.cropGuideTelegramPublication.upsert({
        where: { id: pub.id },
        create: {
          id: pub.id,
          cropGuideId: pub.cropGuideId,
          channelId: pub.channelId,
          botId: pub.botId,
          channelName: pub.channelName,
          botName: pub.botName,
          telegramMessageId: pub.telegramMessageId,
          telegramPostUrl: pub.telegramPostUrl,
          publishedAt: pub.publishedAt,
          createdAt: pub.createdAt,
        },
        update: {
          cropGuideId: pub.cropGuideId,
          channelId: pub.channelId,
          botId: pub.botId,
          channelName: pub.channelName,
          botName: pub.botName,
          telegramMessageId: pub.telegramMessageId,
          telegramPostUrl: pub.telegramPostUrl,
          publishedAt: pub.publishedAt,
        },
      });
    }

    for (const page of pages) {
      await target.sitePage.upsert({
        where: { id: page.id },
        create: {
          id: page.id,
          key: page.key,
          title: page.title,
          sections: page.sections as never,
          status: page.status as never,
          publishedAt: page.publishedAt,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
        update: {
          key: page.key,
          title: page.title,
          sections: page.sections as never,
          status: page.status as never,
          publishedAt: page.publishedAt,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          updatedAt: page.updatedAt,
        },
      });
    }

    console.log(
      `[db:export-content] copied ${bots.length} bots, ${channels.length} channels, ` +
        `${guides.length} guides, ${taxonomyLinks.length} taxonomy links, ` +
        `${publications.length} publications, ${pages.length} site pages → content_db`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch(error => {
  console.error("[db:export-content] FAILED", error);
  process.exitCode = 1;
});
