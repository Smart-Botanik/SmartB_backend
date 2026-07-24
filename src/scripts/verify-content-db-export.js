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
const TABLES = [
    "CropGuide",
    "SitePage",
    "TelegramBot",
    "TelegramChannel",
    "CropGuideTelegramPublication",
    "CropGuideTaxonomyTag",
];
async function countSourceTable(source, table) {
    try {
        const result = await source.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM "${table}"`);
        return Number(result[0]?.count ?? 0);
    }
    catch {
        console.warn(`[db:verify-content-export] source table "${table}" missing — treating as 0`);
        return 0;
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
        const [sourceGuides, targetGuides, sourcePages, targetPages, sourceBots, targetBots, sourceChannels, targetChannels, sourcePubs, targetPubs, sourceLinks, targetLinks,] = await Promise.all([
            countSourceTable(source, "CropGuide"),
            target.cropGuide.count(),
            countSourceTable(source, "SitePage"),
            target.sitePage.count(),
            countSourceTable(source, "TelegramBot"),
            target.telegramBot.count(),
            countSourceTable(source, "TelegramChannel"),
            target.telegramChannel.count(),
            countSourceTable(source, "CropGuideTelegramPublication"),
            target.cropGuideTelegramPublication.count(),
            countSourceTable(source, "CropGuideTaxonomyTag"),
            target.cropGuideTaxonomyTag.count(),
        ]);
        const checks = [
            ["CropGuide", sourceGuides, targetGuides],
            ["SitePage", sourcePages, targetPages],
            ["TelegramBot", sourceBots, targetBots],
            ["TelegramChannel", sourceChannels, targetChannels],
            ["CropGuideTelegramPublication", sourcePubs, targetPubs],
            ["CropGuideTaxonomyTag", sourceLinks, targetLinks],
        ];
        for (const [name, src, tgt] of checks) {
            if (src !== tgt) {
                throw new Error(`${name} count mismatch: source=${src} target=${tgt}`);
            }
        }
        console.log(`[db:verify-content-export] OK — ${targetGuides} guides, ${targetPages} pages, ` +
            `${targetBots} bots, ${targetChannels} channels, ${targetPubs} publications, ` +
            `${targetLinks} taxonomy links`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:verify-content-export] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=verify-content-db-export.js.map