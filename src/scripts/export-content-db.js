"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const content_prisma_for_migration_1 = require("./content-prisma-for-migration");
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
async function queryTableOrWarn(source, label, query) {
    try {
        return await query();
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[db:export-content] ${label} not available — skipping (${reason})`);
        return [];
    }
}
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("CONTENT_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, content_prisma_for_migration_1.createContentPrisma)(targetUrl);
    try {
        const bots = await queryTableOrWarn(source, "TelegramBot", () => source.$queryRaw `
        SELECT id, name, "tokenEncrypted", username, "isActive", "createdAt", "updatedAt"
        FROM "TelegramBot"
        ORDER BY name ASC
      `);
        const channels = await queryTableOrWarn(source, "TelegramChannel", () => source.$queryRaw `
        SELECT id, name, "chatId", "botId", "isDefault", "isActive", "publicUrl",
          "createdAt", "updatedAt"
        FROM "TelegramChannel"
        ORDER BY name ASC
      `);
        const guides = await queryTableOrWarn(source, "CropGuide", () => source.$queryRaw `
        SELECT id, "cropKind"::text AS "cropKind", slug, title, excerpt, body,
          "bodySiteMd", "bodyTelegramMd", "coverMediaId", status::text AS status,
          "publishedAt", "seoTitle", "seoDescription", "sortOrder",
          "telegramPublishedAt", "telegramMessageId", "telegramPostUrl",
          "createdAt", "updatedAt"
        FROM "CropGuide"
        ORDER BY "sortOrder" ASC, slug ASC
      `);
        const taxonomyLinks = await queryTableOrWarn(source, "CropGuideTaxonomyTag", () => source.$queryRaw `
        SELECT "cropGuideId", "taxonomyTagId"
        FROM "CropGuideTaxonomyTag"
      `);
        const publications = await queryTableOrWarn(source, "CropGuideTelegramPublication", () => source.$queryRaw `
          SELECT id, "cropGuideId", "channelId", "botId", "channelName", "botName",
            "telegramMessageId", "telegramPostUrl", "publishedAt", "createdAt"
          FROM "CropGuideTelegramPublication"
          ORDER BY "publishedAt" ASC
        `);
        const pages = await queryTableOrWarn(source, "SitePage", () => source.$queryRaw `
        SELECT id, key, title, sections, status::text AS status, "publishedAt",
          "seoTitle", "seoDescription", "createdAt", "updatedAt"
        FROM "SitePage"
        ORDER BY key ASC
      `);
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
            await target.cropGuide.upsert({
                where: { id: guide.id },
                create: {
                    id: guide.id,
                    cropKind: guide.cropKind,
                    slug: guide.slug,
                    title: guide.title,
                    excerpt: guide.excerpt,
                    body: guide.body,
                    bodySiteMd: guide.bodySiteMd,
                    bodyTelegramMd: guide.bodyTelegramMd,
                    coverMediaId: guide.coverMediaId,
                    status: guide.status,
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
                    cropKind: guide.cropKind,
                    slug: guide.slug,
                    title: guide.title,
                    excerpt: guide.excerpt,
                    body: guide.body,
                    bodySiteMd: guide.bodySiteMd,
                    bodyTelegramMd: guide.bodyTelegramMd,
                    coverMediaId: guide.coverMediaId,
                    status: guide.status,
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
                    sections: page.sections,
                    status: page.status,
                    publishedAt: page.publishedAt,
                    seoTitle: page.seoTitle,
                    seoDescription: page.seoDescription,
                    createdAt: page.createdAt,
                    updatedAt: page.updatedAt,
                },
                update: {
                    key: page.key,
                    title: page.title,
                    sections: page.sections,
                    status: page.status,
                    publishedAt: page.publishedAt,
                    seoTitle: page.seoTitle,
                    seoDescription: page.seoDescription,
                    updatedAt: page.updatedAt,
                },
            });
        }
        console.log(`[db:export-content] copied ${bots.length} bots, ${channels.length} channels, ` +
            `${guides.length} guides, ${taxonomyLinks.length} taxonomy links, ` +
            `${publications.length} publications, ${pages.length} site pages → content_db`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:export-content] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=export-content-db.js.map