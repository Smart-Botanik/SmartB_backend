import { PrismaClient } from "@prisma/client";

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

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("TAXONOMY_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = new PrismaClient({
    datasources: { db: { url: targetUrl } },
  });

  try {
    const [sourceScopes, targetScopes, sourceTags, targetTags] =
      await Promise.all([
        source.taxonomyScope.count(),
        target.taxonomyScope.count(),
        source.taxonomyTag.findMany({
          select: { id: true, key: true, scopeKey: true, parentId: true },
        }),
        target.taxonomyTag.findMany({
          select: { id: true, key: true, scopeKey: true, parentId: true },
        }),
      ]);

    if (sourceScopes !== targetScopes) {
      throw new Error(
        `Scope count mismatch: source=${sourceScopes} target=${targetScopes}`,
      );
    }
    if (sourceTags.length !== targetTags.length) {
      throw new Error(
        `Tag count mismatch: source=${sourceTags.length} target=${targetTags.length}`,
      );
    }

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
