/**
 * One-time export from a **pre-cutover** monolith Postgres (Brand/Product tables still present).
 * Target writes via reference-data-service Prisma client (`REFERENCE_DATA_DATABASE_URL`).
 */
import { PrismaClient } from "@prisma/client";
import { createReferenceDataPrisma } from "./reference-data-prisma-for-migration";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

type BrandRow = {
  id: string;
  name: string;
  category: string;
  avatarMediaId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  brandId: string;
  avatarMediaId: string | null;
  summarize: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TaxonomyLinkRow = {
  productId: string;
  taxonomyTagId: string;
};

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("REFERENCE_DATA_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = createReferenceDataPrisma(targetUrl);

  try {
    const brands = await source.$queryRaw<BrandRow[]>`
      SELECT id, name, category::text AS category, "avatarMediaId", description, "createdAt", "updatedAt"
      FROM "Brand"
      ORDER BY name ASC
    `;
    const products = await source.$queryRaw<ProductRow[]>`
      SELECT id, name, category, "brandId", "avatarMediaId", summarize, "createdAt", "updatedAt"
      FROM "Product"
      ORDER BY name ASC
    `;
    let links: TaxonomyLinkRow[] = [];
    try {
      links = await source.$queryRaw<TaxonomyLinkRow[]>`
        SELECT "A" AS "productId", "B" AS "taxonomyTagId" FROM "_ProductTaxonomyTags"
      `;
    } catch {
      console.warn(
        "[db:export-reference-data] _ProductTaxonomyTags not found — skipping taxonomy links",
      );
    }

    for (const brand of brands) {
      await target.brand.upsert({
        where: { id: brand.id },
        create: {
          id: brand.id,
          name: brand.name,
          category: brand.category as never,
          avatarMediaId: brand.avatarMediaId,
          description: brand.description,
          createdAt: brand.createdAt,
          updatedAt: brand.updatedAt,
        },
        update: {
          name: brand.name,
          category: brand.category as never,
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

      await target.$executeRaw`
        DELETE FROM "ProductTaxonomyTag" WHERE "productId" = ${product.id}
      `;
    }

    const linksByProduct = new Map<string, string[]>();
    for (const link of links) {
      const list = linksByProduct.get(link.productId) ?? [];
      list.push(link.taxonomyTagId);
      linksByProduct.set(link.productId, list);
    }
    for (const product of products) {
      for (const tagId of linksByProduct.get(product.id) ?? []) {
        await target.$executeRaw`
          INSERT INTO "ProductTaxonomyTag" ("productId", "taxonomyTagId")
          VALUES (${product.id}, ${tagId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    console.log(
      `[db:export-reference-data] copied ${brands.length} brands, ${products.length} products, ${links.length} taxonomy links → reference_data_db`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch(error => {
  console.error("[db:export-reference-data] FAILED", error);
  process.exitCode = 1;
});
