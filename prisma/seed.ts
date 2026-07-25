import { PrismaClient } from "@prisma/client";
import { GROW_SEED_ACCOUNT_IDS } from "../src/modules/users/grow-seed-accounts";
import { seedActionPathRegistry } from "../src/scripts/seed-action-path-registry";
import { seedRegistryFieldSpecs } from "../src/scripts/seed-registry-field-specs";
import { seedSiteContent } from "../src/scripts/seed-site-content";
import { seedDevLocationGroups } from "../src/scripts/seed-dev-location-groups";
import { seedDevLocations } from "../src/scripts/seed-dev-locations";
import { seedDevMetrics } from "../src/scripts/seed-dev-metrics";
import { seedDevPlantEvents } from "../src/scripts/seed-dev-plant-events";
import { seedDevPlantPlacement } from "../src/scripts/seed-dev-plant-placement";
import { seedTaxonomyTags } from "../src/scripts/run-seed-taxonomy-tags";

const prisma = new PrismaClient();

async function ensureGrowSeedAccounts() {
  // Identity (email/password/role) is seeded in services/auth — same ids.
  for (const id of Object.values(GROW_SEED_ACCOUNT_IDS)) {
    await prisma.user.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
  console.log("Ensured grow account stubs:", GROW_SEED_ACCOUNT_IDS);
}

async function main() {
  console.log("Start seeding...");

  await ensureGrowSeedAccounts();

  // Brand / Product: reference-data-service — см. services/reference-data `npm run db:seed`

  const taxonomySeedResult = await seedTaxonomyTags();
  console.log("Seeded taxonomy tags:", taxonomySeedResult);

  const seedScope = process.env.REGISTRY_SEED_SCOPE === "mvp" ? "mvp" : "full";
  const registrySeedResult = await seedActionPathRegistry(prisma, seedScope);
  console.log("Seeded action path registry:", registrySeedResult);

  await Promise.all([
    prisma.primitive.upsert({
      where: { key: "ph" },
      update: {},
      create: {
        key: "ph",
        name: "pH",
        valueType: "number",
        unit: "pH",
        validation: { min: 0, max: 14, precision: 2 },
      },
    }),
    prisma.primitive.upsert({
      where: { key: "ppm" },
      update: {},
      create: {
        key: "ppm",
        name: "PPM",
        valueType: "number",
        unit: "ppm",
        validation: { min: 0, precision: 0 },
      },
    }),
    prisma.primitive.upsert({
      where: { key: "temperature" },
      update: {},
      create: {
        key: "temperature",
        name: "Temperature",
        valueType: "number",
        unit: "C",
        validation: { min: -50, max: 120, precision: 2 },
      },
    }),
  ]);
  console.log("Seeded primitives: ph, ppm, temperature");

  const registryFieldSpecsResult = await seedRegistryFieldSpecs(prisma);
  console.log("Seeded registry field specs:", registryFieldSpecsResult);

  const siteContentResult = await seedSiteContent();
  console.log("Seeded site content (content_db):", siteContentResult);

  const devLocationsResult = await seedDevLocations(prisma);
  console.log("Seeded dev locations (REW-01-6):", devLocationsResult);

  const devLocationGroupsResult = await seedDevLocationGroups(prisma);
  console.log("Seeded dev location groups (REW-04):", devLocationGroupsResult);

  const devPlacementResult = await seedDevPlantPlacement(prisma);
  console.log("Seeded dev plant placement (REW-06):", devPlacementResult);

  const devMetricsResult = await seedDevMetrics(prisma);
  console.log("Seeded dev metrics (REW-05):", devMetricsResult);

  const devPlantEventsResult = await seedDevPlantEvents(prisma);
  console.log("Seeded dev plant events (REW-07):", devPlantEventsResult);

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
