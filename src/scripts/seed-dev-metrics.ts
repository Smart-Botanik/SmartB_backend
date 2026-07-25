import type { PrismaClient } from "@prisma/client";

const SEED_PREFIX = "seed:rew-05";

const GROWBOX_NAME = "DEV — Гроубокс 120";
const BALCONY_NAME = "DEV — Балкон юг";
const OUTDOOR_NAME = "DEV — Грядка А";

type MetricFixture = {
  slug: string;
  description: string;
  locationNames: string[];
  attachPlantSlugs?: string[];
};

const METRIC_FIXTURES: MetricFixture[] = [
  {
    slug: "indoor-season",
    description: "Indoor growbox + balcony (REW-05 scenario: season on dacha subset)",
    locationNames: [GROWBOX_NAME, BALCONY_NAME],
  },
  {
    slug: "full-garden",
    description: "All dev locations + placement demo plants",
    locationNames: [GROWBOX_NAME, BALCONY_NAME, OUTDOOR_NAME],
    attachPlantSlugs: ["planned", "queued", "seated"],
  },
];

export async function seedDevMetrics(prisma: PrismaClient) {
  const { resolveGrowSeedUser } = await import("./resolve-grow-seed-user");
  const user = await resolveGrowSeedUser(prisma, "seedDevMetrics");

  const locations = await prisma.location.findMany({
    where: { userId: user.id, name: { startsWith: "DEV —" } },
    select: { id: true, name: true },
  });
  const locationIdByName = new Map(locations.map((l) => [l.name, l.id]));

  const placementPlants = await prisma.plant.findMany({
    where: { userId: user.id, name: { startsWith: "seed:rew-06:" } },
    select: { id: true, name: true },
  });
  const plantIdBySlug = new Map(
    placementPlants.map((p) => [p.name.replace("seed:rew-06:", ""), p.id]),
  );

  let created = 0;
  let updated = 0;
  const results: Array<{ slug: string; id: string; locationCount: number; plantCount: number }> =
    [];

  for (const fixture of METRIC_FIXTURES) {
    const seedName = `${SEED_PREFIX}:${fixture.slug}`;
    const locationIds = fixture.locationNames
      .map((name) => locationIdByName.get(name))
      .filter((id): id is string => Boolean(id));

    const plantIds = (fixture.attachPlantSlugs ?? [])
      .map((slug) => plantIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    const existing = await prisma.metric.findFirst({
      where: { userId: user.id, name: seedName },
      include: { locationMembers: true, plantMembers: true },
    });

    if (existing) {
      const existingLoc = new Set(existing.locationMembers.map((m) => m.locationId));
      const toAddLoc = locationIds.filter((id) => !existingLoc.has(id));
      if (toAddLoc.length > 0) {
        await prisma.metricLocationMember.createMany({
          data: toAddLoc.map((locationId, index) => ({
            metricId: existing.id,
            locationId,
            sortOrder: existing.locationMembers.length + index,
          })),
          skipDuplicates: true,
        });
      }

      const existingPlants = new Set(existing.plantMembers.map((m) => m.plantId));
      const toAddPlants = plantIds.filter((id) => !existingPlants.has(id));
      if (toAddPlants.length > 0) {
        await prisma.metricPlantMember.createMany({
          data: toAddPlants.map((plantId, index) => ({
            metricId: existing.id,
            plantId,
            sortOrder: existing.plantMembers.length + index,
          })),
          skipDuplicates: true,
        });
      }

      updated += 1;
      results.push({
        slug: fixture.slug,
        id: existing.id,
        locationCount: locationIds.length,
        plantCount: plantIds.length,
      });
      continue;
    }

    const metric = await prisma.metric.create({
      data: {
        userId: user.id,
        name: seedName,
        description: fixture.description,
        displayPrefs: {
          widgets: [{ kind: "location" }, { kind: "plant" }],
        },
        locationMembers: {
          create: locationIds.map((locationId, index) => ({
            locationId,
            sortOrder: index,
          })),
        },
        ...(plantIds.length > 0 && {
          plantMembers: {
            create: plantIds.map((plantId, index) => ({
              plantId,
              sortOrder: index,
            })),
          },
        }),
      },
    });

    created += 1;
    results.push({
      slug: fixture.slug,
      id: metric.id,
      locationCount: locationIds.length,
      plantCount: plantIds.length,
    });
  }

  return { created, updated, metrics: results };
}
