"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const taxonomy_prisma_for_migration_1 = require("./taxonomy-prisma-for-migration");
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
function forestRootCount(tags, scopeKey) {
    return tags.filter(tag => tag.scopeKey === scopeKey && tag.parentId === null)
        .length;
}
async function countSourceTable(source, table) {
    const sql = table === "TaxonomyScope"
        ? `SELECT COUNT(*)::bigint AS count FROM "TaxonomyScope"`
        : `SELECT COUNT(*)::bigint AS count FROM "TaxonomyTag"`;
    const result = await source.$queryRawUnsafe(sql);
    return Number(result[0]?.count ?? 0);
}
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("TAXONOMY_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, taxonomy_prisma_for_migration_1.createTaxonomyPrisma)(targetUrl);
    try {
        const [sourceScopes, targetScopes, sourceTagCount, targetTags] = await Promise.all([
            countSourceTable(source, "TaxonomyScope"),
            target.taxonomyScope.count(),
            countSourceTable(source, "TaxonomyTag"),
            target.taxonomyTag.findMany({
                select: { id: true, key: true, scopeKey: true, parentId: true },
            }),
        ]);
        if (sourceScopes !== targetScopes) {
            throw new Error(`Scope count mismatch: source=${sourceScopes} target=${targetScopes}`);
        }
        if (sourceTagCount !== targetTags.length) {
            throw new Error(`Tag count mismatch: source=${sourceTagCount} target=${targetTags.length}`);
        }
        const sourceTags = await source.$queryRaw `
      SELECT id, key, "scopeKey", "parentId" FROM "TaxonomyTag"
    `;
        const sourceKeys = new Set(sourceTags.map(tag => tag.key).sort());
        const targetKeys = new Set(targetTags.map(tag => tag.key).sort());
        if (sourceKeys.size !== targetKeys.size) {
            throw new Error("Tag key set size mismatch");
        }
        for (const key of sourceKeys) {
            if (!targetKeys.has(key)) {
                throw new Error(`Missing tag key in target: ${key}`);
            }
        }
        const cropRootsSource = forestRootCount(sourceTags, "crop");
        const cropRootsTarget = forestRootCount(targetTags, "crop");
        if (cropRootsSource !== cropRootsTarget) {
            throw new Error(`crop forest root count mismatch: source=${cropRootsSource} target=${cropRootsTarget}`);
        }
        console.log(`[db:verify-taxonomy-export] OK — ${targetScopes} scopes, ${targetTags.length} tags, crop roots=${cropRootsTarget}`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:verify-taxonomy-export] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=verify-taxonomy-db-export.js.map