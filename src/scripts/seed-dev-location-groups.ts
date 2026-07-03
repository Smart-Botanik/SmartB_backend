import type { PrismaClient } from "@prisma/client";

const SEED_PREFIX = "seed:rew-04";

type DevLocationGroupFixture = {
  slug: string;
  description?: string;
  locationSlugs: string[];
};

const SLUG_TO_DEV_NAME: Record<string, string> = {
  "growbox-fixed-grid": "DEV — Гроубокс 120",
  "outdoor-bed-unlimited": "DEV — Грядка А",
  "balcony-simple-counter": "DEV — Балкон юг",
};

const DEV_LOCATION_GROUP_FIXTURES: DevLocationGroupFixture[] = [
  {
    slug: "indoor-zone",
    description: "Гроубокс + балкон (spatial group, not Metrics)",
    locationSlugs: ["growbox-fixed-grid", "balcony-simple-counter"],
  },
  {
    slug: "outdoor-zone",
    description: "Открытый грунт",
    locationSlugs: ["outdoor-bed-unlimited"],
  },
];

export async function seedDevLocationGroups(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { email: "user@growingapp.com" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("seedDevLocationGroups: user@growingapp.com not found — run user seed first");
  }

  const locations = await prisma.location.findMany({
    where: {
      userId: user.id,
      name: { startsWith: "DEV —" },
    },
    select: { id: true, name: true },
  });

  const locationIdBySlug = new Map<string, string>();
  for (const [slug, devName] of Object.entries(SLUG_TO_DEV_NAME)) {
    const loc = locations.find((l) => l.name === devName);
    if (loc) {
      locationIdBySlug.set(slug, loc.id);
    }
  }

  let created = 0;
  let updated = 0;

  for (const fixture of DEV_LOCATION_GROUP_FIXTURES) {
    const seedName = `${SEED_PREFIX}:${fixture.slug}`;
    const memberIds = fixture.locationSlugs
      .map((s) => locationIdBySlug.get(s))
      .filter((id): id is string => Boolean(id));

    const existing = await prisma.locationGroup.findFirst({
      where: { userId: user.id, name: seedName },
      include: { members: true },
    });

    if (existing) {
      const existingIds = new Set(existing.members.map((m) => m.locationId));
      const toAdd = memberIds.filter((id) => !existingIds.has(id));
      if (toAdd.length > 0) {
        await prisma.locationGroupMember.createMany({
          data: toAdd.map((locationId, index) => ({
            locationGroupId: existing.id,
            locationId,
            sortOrder: existing.members.length + index,
          })),
          skipDuplicates: true,
        });
      }
      updated += 1;
      continue;
    }

    await prisma.locationGroup.create({
      data: {
        userId: user.id,
        name: seedName,
        description: fixture.description ?? null,
        members: {
          create: memberIds.map((locationId, index) => ({
            locationId,
            sortOrder: index,
          })),
        },
      },
    });
    created += 1;
  }

  return { created, updated, fixtures: DEV_LOCATION_GROUP_FIXTURES.length };
}
