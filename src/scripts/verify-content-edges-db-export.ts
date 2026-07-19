/**
 * Verifies monolith ContentFacet* counts against content_edges_db.
 */
import { PrismaClient } from "@prisma/client";
import { createContentEdgesPrisma } from "./content-edges-prisma-for-migration";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function countSourceTable(
  source: PrismaClient,
  table: "ContentFacetProfile" | "ContentFacetSlot",
): Promise<number> {
  try {
    const result = await source.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
    );
    return Number(result[0]?.count ?? 0);
  } catch {
    console.warn(
      `[db:verify-content-edges-export] source table "${table}" missing — treating as 0`,
    );
    return 0;
  }
}

async function main() {
  const sourceUrl = requireEnv("DATABASE_URL");
  const targetUrl = requireEnv("CONTENT_EDGES_DATABASE_URL");

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = createContentEdgesPrisma(targetUrl);

  try {
    const [sourceProfiles, targetProfiles, sourceSlots, targetSlots] =
      await Promise.all([
        countSourceTable(source, "ContentFacetProfile"),
        target.contentFacetProfile.count(),
        countSourceTable(source, "ContentFacetSlot"),
        target.contentFacetSlot.count(),
      ]);

    const mismatches: string[] = [];
    if (sourceProfiles !== targetProfiles) {
      mismatches.push(
        `ContentFacetProfile source=${sourceProfiles} target=${targetProfiles}`,
      );
    }
    if (sourceSlots !== targetSlots) {
      mismatches.push(
        `ContentFacetSlot source=${sourceSlots} target=${targetSlots}`,
      );
    }

    if (mismatches.length > 0) {
      console.error("[db:verify-content-edges-export] FAILED");
      mismatches.forEach(line => console.error(`  - ${line}`));
      process.exitCode = 1;
      return;
    }

    console.log(
      `[db:verify-content-edges-export] OK profiles=${targetProfiles} slots=${targetSlots}`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

void main();
