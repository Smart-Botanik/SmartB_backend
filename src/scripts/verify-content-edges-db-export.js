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
async function countSourceTable(source, table) {
    try {
        const result = await source.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM "${table}"`);
        return Number(result[0]?.count ?? 0);
    }
    catch {
        console.warn(`[db:verify-content-edges-export] source table "${table}" missing — treating as 0`);
        return 0;
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
        const [sourceProfiles, targetProfiles, sourceSlots, targetSlots] = await Promise.all([
            countSourceTable(source, "ContentFacetProfile"),
            target.contentFacetProfile.count(),
            countSourceTable(source, "ContentFacetSlot"),
            target.contentFacetSlot.count(),
        ]);
        const mismatches = [];
        if (sourceProfiles !== targetProfiles) {
            mismatches.push(`ContentFacetProfile source=${sourceProfiles} target=${targetProfiles}`);
        }
        if (sourceSlots !== targetSlots) {
            mismatches.push(`ContentFacetSlot source=${sourceSlots} target=${targetSlots}`);
        }
        if (mismatches.length > 0) {
            console.error("[db:verify-content-edges-export] FAILED");
            mismatches.forEach(line => console.error(`  - ${line}`));
            process.exitCode = 1;
            return;
        }
        console.log(`[db:verify-content-edges-export] OK profiles=${targetProfiles} slots=${targetSlots}`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
void main();
//# sourceMappingURL=verify-content-edges-db-export.js.map