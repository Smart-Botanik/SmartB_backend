/**
 * Verifies pre-cutover monolith taxonomy rows against taxonomy_db.
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

function forestRootCount(
  tags: Array<{ scopeKey: string; parentId: string | null }>,
  scopeKey: string,
) {
  return tags.filter(tag => tag.scopeKey === scopeKey && tag.parentId === null)
    .length;
}

async function countSourceTable(
  source: PrismaClient,
  table: "TaxonomyScope" | "TaxonomyTag",
): Promise<number> {
  const sql =
    table === "TaxonomyScope"
      ? `SELECT COUNT(*)::bigint AS count FROM "TaxonomyScope"`
      : `SELECT COUNT(*)::bigint AS count FROM "TaxonomyTag"`;
  const result = await source.$queryRawUnsafe<Array<{ count: bigint }>>(sql);
  return Number(result[0]?.count ?? 0);
}

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("TAXONOMY_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = createTaxonomyPrisma(targetUrl);

  try {
    const [sourceScopes, targetScopes, sourceTagCount, targetTags] =
      await Promise.all([
        countSourceTable(source, "TaxonomyScope"),
        target.taxonomyScope.count(),
        countSourceTable(source, "TaxonomyTag"),
        target.taxonomyTag.findMany({
          select: { id: true, key: true, scopeKey: true, parentId: true },
        }) as Promise<
          Array<{ id: string; key: string; scopeKey: string; parentId: string | null }>
        >,
      ]);

    if (sourceScopes !== targetScopes) {
      throw new Error(
        `Scope count mismatch: source=${sourceScopes} target=${targetScopes}`,
      );
    }
    if (sourceTagCount !== targetTags.length) {
      throw new Error(
        `Tag count mismatch: source=${sourceTagCount} target=${targetTags.length}`,
      );
    }

    const sourceTags = await source.$queryRaw<
      Array<{ id: string; key: string; scopeKey: string; parentId: string | null }>
    >`
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
      throw new Error(
        `crop forest root count mismatch: source=${cropRootsSource} target=${cropRootsTarget}`,
      );
    }

    console.log(
      `[db:verify-taxonomy-export] OK — ${targetScopes} scopes, ${targetTags.length} tags, crop roots=${cropRootsTarget}`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch(error => {
  console.error("[db:verify-taxonomy-export] FAILED", error);
  process.exitCode = 1;
});
