"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const reference_data_prisma_for_migration_1 = require("./reference-data-prisma-for-migration");
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
async function countSourceTable(source, table) {
    const sql = table === "Brand"
        ? `SELECT COUNT(*)::bigint AS count FROM "Brand"`
        : `SELECT COUNT(*)::bigint AS count FROM "Product"`;
    const result = await source.$queryRawUnsafe(sql);
    return Number(result[0]?.count ?? 0);
}
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("REFERENCE_DATA_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, reference_data_prisma_for_migration_1.createReferenceDataPrisma)(targetUrl);
    try {
        const [sourceBrands, targetBrands, sourceProducts, targetProducts] = await Promise.all([
            countSourceTable(source, "Brand"),
            target.brand.count(),
            countSourceTable(source, "Product"),
            target.product.count(),
        ]);
        if (sourceBrands !== targetBrands) {
            throw new Error(`Brand count mismatch: source=${sourceBrands} target=${targetBrands}`);
        }
        if (sourceProducts !== targetProducts) {
            throw new Error(`Product count mismatch: source=${sourceProducts} target=${targetProducts}`);
        }
        let sourceLinkCount = 0;
        try {
            const linkRows = await source.$queryRaw `
        SELECT COUNT(*)::bigint AS count FROM "_ProductTaxonomyTags"
      `;
            sourceLinkCount = Number(linkRows[0]?.count ?? 0);
        }
        catch {
            sourceLinkCount = 0;
        }
        const targetLinkRows = await target.$queryRaw `
      SELECT COUNT(*)::bigint AS count FROM "ProductTaxonomyTag"
    `;
        const targetLinkCount = Number(targetLinkRows[0]?.count ?? 0);
        if (sourceLinkCount !== targetLinkCount) {
            throw new Error(`Taxonomy link count mismatch: source=${sourceLinkCount} target=${targetLinkCount}`);
        }
        const sourceBrandIds = await source.$queryRaw `
      SELECT id FROM "Brand"
    `;
        const targetBrandIds = new Set((await target.brand.findMany({ select: { id: true } })).map(b => b.id));
        for (const row of sourceBrandIds) {
            if (!targetBrandIds.has(row.id)) {
                throw new Error(`Missing brand id in target: ${row.id}`);
            }
        }
        console.log(`[db:verify-reference-data-export] OK — ${targetBrands} brands, ${targetProducts} products, ${targetLinkCount} taxonomy links`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:verify-reference-data-export] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=verify-reference-data-db-export.js.map