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
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("TAXONOMY_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, taxonomy_prisma_for_migration_1.createTaxonomyPrisma)(targetUrl);
    try {
        const scopes = await source.$queryRaw `
      SELECT key, label, description, "sortOrder", "createdAt", "updatedAt"
      FROM "TaxonomyScope"
    `;
        const tags = await source.$queryRaw `
      SELECT id, "scopeKey", key, namespace::text AS namespace, label, "sortOrder",
        "parentId", "cropKind"::text AS "cropKind", "variantAxis", status::text AS status,
        "createdAt", "updatedAt"
      FROM "TaxonomyTag"
      ORDER BY "scopeKey" ASC, key ASC
    `;
        for (const scope of scopes) {
            await target.taxonomyScope.upsert({
                where: { key: scope.key },
                create: {
                    key: scope.key,
                    label: scope.label,
                    description: scope.description,
                    sortOrder: scope.sortOrder,
                    createdAt: scope.createdAt,
                    updatedAt: scope.updatedAt,
                },
                update: {
                    label: scope.label,
                    description: scope.description,
                    sortOrder: scope.sortOrder,
                    updatedAt: scope.updatedAt,
                },
            });
        }
        for (const tag of tags) {
            await target.taxonomyTag.upsert({
                where: { id: tag.id },
                create: {
                    id: tag.id,
                    scopeKey: tag.scopeKey,
                    key: tag.key,
                    namespace: tag.namespace,
                    label: tag.label,
                    sortOrder: tag.sortOrder,
                    parentId: tag.parentId,
                    cropKind: tag.cropKind,
                    variantAxis: tag.variantAxis,
                    status: tag.status,
                    createdAt: tag.createdAt,
                    updatedAt: tag.updatedAt,
                },
                update: {
                    scopeKey: tag.scopeKey,
                    key: tag.key,
                    namespace: tag.namespace,
                    label: tag.label,
                    sortOrder: tag.sortOrder,
                    parentId: tag.parentId,
                    cropKind: tag.cropKind,
                    variantAxis: tag.variantAxis,
                    status: tag.status,
                    updatedAt: tag.updatedAt,
                },
            });
        }
        console.log(`[db:export-taxonomy] copied ${scopes.length} scopes, ${tags.length} tags → taxonomy_db`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:export-taxonomy] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=export-taxonomy-db.js.map