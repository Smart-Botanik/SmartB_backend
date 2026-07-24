"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const content_edges_prisma_for_migration_1 = require("./content-edges-prisma-for-migration");
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
        console.warn(`[db:export-content-edges] ${label} not available — skipping (${reason})`);
        return [];
    }
}
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("CONTENT_EDGES_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, content_edges_prisma_for_migration_1.createContentEdgesPrisma)(targetUrl);
    try {
        const profiles = await queryTableOrWarn(source, "ContentFacetProfile", () => source.contentFacetProfile.findMany());
        const slots = await queryTableOrWarn(source, "ContentFacetSlot", () => source.contentFacetSlot.findMany());
        for (const profile of profiles) {
            await target.contentFacetProfile.upsert({
                where: { id: profile.id },
                create: profile,
                update: profile,
            });
        }
        const profileIds = profiles.map(profile => profile.id);
        if (profileIds.length > 0) {
            await target.contentFacetSlot.deleteMany({
                where: { profileId: { in: profileIds } },
            });
        }
        if (slots.length > 0) {
            await target.contentFacetSlot.createMany({ data: slots });
        }
        console.log(`[db:export-content-edges] exported profiles=${profiles.length} slots=${slots.length}`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
void main();
//# sourceMappingURL=export-content-edges-db.js.map