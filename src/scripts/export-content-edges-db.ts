/**
 * One-time export ContentFacet* from monolith Postgres → content_edges_db.
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

type ContentFacetProfileRow = {
  id: string;
  subjectType: string;
  subjectId: string;
  subjectKey: string | null;
  profileKind: string;
  status: string;
  revision: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ContentFacetSlotRow = {
  id: string;
  profileId: string;
  kind: string;
  role: string | null;
  mediaId: string | null;
  textValue: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

async function queryTableOrWarn<T>(
  source: PrismaClient,
  label: string,
  query: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await query();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[db:export-content-edges] ${label} not available — skipping (${reason})`,
    );
    return [];
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
    const profiles = await queryTableOrWarn<ContentFacetProfileRow>(
      source,
      "ContentFacetProfile",
      () => source.contentFacetProfile.findMany(),
    );

    const slots = await queryTableOrWarn<ContentFacetSlotRow>(
      source,
      "ContentFacetSlot",
      () => source.contentFacetSlot.findMany(),
    );

    for (const profile of profiles) {
      await target.contentFacetProfile.upsert({
        where: { id: profile.id },
        create: profile,
        update: profile,
      });
    }

    const profileIds = profiles.map(profile => profile.id);
    if (profileIds.length > 0) {
      await target.contentFacetSlot.deleteMany({
        where: { profileId: { in: profileIds } },
      });
    }

    if (slots.length > 0) {
      await target.contentFacetSlot.createMany({ data: slots });
    }

    console.log(
      `[db:export-content-edges] exported profiles=${profiles.length} slots=${slots.length}`,
    );
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

void main();
