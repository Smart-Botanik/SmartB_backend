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
async function main() {
    const sourceUrl = requireEnv("DATABASE_URL");
    const targetUrl = requireEnv("REFERENCE_DATA_DATABASE_URL");
    const source = new client_1.PrismaClient({
        datasources: { db: { url: sourceUrl } },
    });
    const target = (0, reference_data_prisma_for_migration_1.createReferenceDataPrisma)(targetUrl);
    try {
        const brands = await source.$queryRaw `
      SELECT id, name, category::text AS category, "avatarMediaId", description, "createdAt", "updatedAt"
      FROM "Brand"
      ORDER BY name ASC
    `;
        const products = await source.$queryRaw `
      SELECT id, name, category, "brandId", "avatarMediaId", summarize, "createdAt", "updatedAt"
      FROM "Product"
      ORDER BY name ASC
    `;
        let links = [];
        try {
            links = await source.$queryRaw `
        SELECT "A" AS "productId", "B" AS "taxonomyTagId" FROM "_ProductTaxonomyTags"
      `;
        }
        catch {
            console.warn("[db:export-reference-data] _ProductTaxonomyTags not found — skipping taxonomy links");
        }
        for (const brand of brands) {
            await target.brand.upsert({
                where: { id: brand.id },
                create: {
                    id: brand.id,
                    name: brand.name,
                    category: brand.category,
                    avatarMediaId: brand.avatarMediaId,
                    description: brand.description,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt,
                },
                update: {
                    name: brand.name,
                    category: brand.category,
                    avatarMediaId: brand.avatarMediaId,
                    description: brand.description,
                    updatedAt: brand.updatedAt,
                },
            });
        }
        for (const product of products) {
            await target.product.upsert({
                where: { id: product.id },
                create: {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    brandId: product.brandId,
                    avatarMediaId: product.avatarMediaId,
                    summarize: product.summarize,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                },
                update: {
                    name: product.name,
                    category: product.category,
                    brandId: product.brandId,
                    avatarMediaId: product.avatarMediaId,
                    summarize: product.summarize,
                    updatedAt: product.updatedAt,
                },
            });
            await target.$executeRaw `
        DELETE FROM "ProductTaxonomyTag" WHERE "productId" = ${product.id}
      `;
        }
        const linksByProduct = new Map();
        for (const link of links) {
            const list = linksByProduct.get(link.productId) ?? [];
            list.push(link.taxonomyTagId);
            linksByProduct.set(link.productId, list);
        }
        for (const product of products) {
            for (const tagId of linksByProduct.get(product.id) ?? []) {
                await target.$executeRaw `
          INSERT INTO "ProductTaxonomyTag" ("productId", "taxonomyTagId")
          VALUES (${product.id}, ${tagId})
          ON CONFLICT DO NOTHING
        `;
            }
        }
        console.log(`[db:export-reference-data] copied ${brands.length} brands, ${products.length} products, ${links.length} taxonomy links → reference_data_db`);
    }
    finally {
        await source.$disconnect();
        await target.$disconnect();
    }
}
main().catch(error => {
    console.error("[db:export-reference-data] FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=export-reference-data-db.js.map