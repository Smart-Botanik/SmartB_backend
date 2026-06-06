/**
 * One-time export from a **pre-cutover** monolith Postgres (TaxonomyScope/Tag tables present).
 */
import { PrismaClient } from "@prisma/client";
import { createTaxonomyPrisma } from "./taxonomy-prisma-for-migration";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

type ScopeRow = {
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type TagRow = {
  id: string;
  scopeKey: string;
  key: string;
  namespace: string;
  label: string;
  sortOrder: number;
  parentId: string | null;
  cropKind: string | null;
  variantAxis: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("TAXONOMY_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = createTaxonomyPrisma(targetUrl);

  try {
    const scopes = await source.$queryRaw<ScopeRow[]>`
      SELECT key, label, description, "sortOrder", "createdAt", "updatedAt"
      FROM "TaxonomyScope"
    `;
    const tags = await source.$queryRaw<TagRow[]>`
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
          namespace: tag.namespace as never,
          label: tag.label,
          sortOrder: tag.sortOrder,
          parentId: tag.parentId,
          cropKind: tag.cropKind as never,
          variantAxis: tag.variantAxis,
          status: tag.status as never,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt,
        },
        update: {
          scopeKey: tag.scopeKey,
          key: tag.key,
          namespace: tag.namespace as never,
          label: tag.label,
          sortOrder: tag.sortOrder,
          parentId: tag.parentId,
          cropKind: tag.cropKind as never,
          variantAxis: tag.variantAxis,
          status: tag.status as never,
          updatedAt: tag.updatedAt,
        },
      });
    }

    console.log(
      `[db:export-taxonomy] copied ${scopes.length} scopes, ${tags.length} tags → taxonomy_db`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch(error => {
  console.error("[db:export-taxonomy] FAILED", error);
  process.exitCode = 1;
});
