import {
  ENVIRONMENT_VARIANT_TO_LOCATION_SUB_TYPE,
  environmentGroupSlugFromVariantKey,
} from "@growing/contracts";
import type {
  LocationSubType,
  LocationType,
  Prisma,
  PrismaClient,
  SeatLayoutMode,
} from "@prisma/client";
import { createTaxonomyPrisma } from "./taxonomy-prisma-for-migration";

const SEED_PREFIX = "seed:bk-rew-01-6";

type DevLocationFixture = {
  slug: string;
  name: string;
  environmentVariantKey: string;
  seatLayoutMode: SeatLayoutMode;
  dimensions?: Prisma.InputJsonValue;
  layoutMeta?: Prisma.InputJsonValue;
  wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics";
  capacity?: number;
  occupiedCount?: number;
  specBlocks?: Array<{
    position: number;
    kind: "space";
    space: { width: number; height: number; depth: number };
  }>;
  seats?: Array<{
    label: string;
    position: { row: number; col: number };
  }>;
};

const DEV_LOCATION_FIXTURES: DevLocationFixture[] = [
  {
    slug: "growbox-fixed-grid",
    name: "DEV — Гроубокс 120",
    environmentVariantKey: "environment.type.indoor.growbox",
    seatLayoutMode: "fixed_grid",
    dimensions: { width: 120, depth: 60, height: 180, unit: "cm" },
    layoutMeta: { gridCols: 4, gridRows: 1, cellWidthCm: 25, cellDepthCm: 25 },
    wateringType: "manual",
    occupiedCount: 0,
    specBlocks: [
      {
        position: 0,
        kind: "space",
        space: { width: 120, height: 180, depth: 60 },
      },
    ],
    seats: [
      { label: "A1", position: { row: 0, col: 0 } },
      { label: "A2", position: { row: 0, col: 1 } },
      { label: "A3", position: { row: 0, col: 2 } },
      { label: "A4", position: { row: 0, col: 3 } },
    ],
  },
  {
    slug: "outdoor-bed-unlimited",
    name: "DEV — Грядка А",
    environmentVariantKey: "environment.type.outdoor.bed",
    seatLayoutMode: "unlimited",
    wateringType: "manual",
    occupiedCount: 0,
  },
  {
    slug: "balcony-simple-counter",
    name: "DEV — Балкон юг",
    environmentVariantKey: "environment.type.indoor.shelf",
    seatLayoutMode: "simple_counter",
    wateringType: "drip",
    capacity: 8,
    occupiedCount: 2,
  },
];

async function resolveEnvironmentTagIds(
  variantKeys: string[],
): Promise<Map<string, string>> {
  const url = process.env.TAXONOMY_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "TAXONOMY_DATABASE_URL is required for dev location seed (taxonomy variant tags)",
    );
  }
  const taxonomy = createTaxonomyPrisma(url);
  try {
    const tags = await taxonomy.taxonomyTag.findMany({
      where: { key: { in: variantKeys } },
      select: { id: true, key: true },
    });
    const byKey = new Map(tags.map((t) => [t.key, t.id]));
    const missing = variantKeys.filter((key) => !byKey.has(key));
    if (missing.length > 0) {
      throw new Error(`taxonomy tags not found: ${missing.join(", ")}`);
    }
    return byKey;
  } finally {
    await taxonomy.$disconnect();
  }
}

function legacyTypeFieldsFromVariantKey(variantKey: string): {
  environmentGroupSlug: string | null;
  type: LocationType | null;
  subType: LocationSubType | null;
} {
  const subType = ENVIRONMENT_VARIANT_TO_LOCATION_SUB_TYPE[variantKey] ?? null;
  const environmentGroupSlug = environmentGroupSlugFromVariantKey(variantKey);
  const type = environmentGroupSlug
    ? (environmentGroupSlug as LocationType)
    : null;
  return { environmentGroupSlug, type, subType };
}

async function upsertDevLocation(
  prisma: PrismaClient,
  userId: string,
  fixture: DevLocationFixture,
  tagIdsByKey: Map<string, string>,
) {
  const description = `${SEED_PREFIX}:${fixture.slug}`;
  const environmentTagId = tagIdsByKey.get(fixture.environmentVariantKey);
  if (!environmentTagId) {
    throw new Error(`taxonomy tag id missing for ${fixture.environmentVariantKey}`);
  }
  const legacy = legacyTypeFieldsFromVariantKey(fixture.environmentVariantKey);

  const data: Prisma.LocationCreateInput = {
    user: { connect: { id: userId } },
    name: fixture.name,
    description,
    status: "active",
    environmentTagId,
    environmentGroupSlug: legacy.environmentGroupSlug,
    type: legacy.type,
    subType: legacy.subType,
    seatLayoutMode: fixture.seatLayoutMode,
    ...(fixture.dimensions != null && { dimensions: fixture.dimensions }),
    ...(fixture.layoutMeta != null && { layoutMeta: fixture.layoutMeta }),
    ...(fixture.wateringType != null && { wateringType: fixture.wateringType }),
    ...(fixture.capacity != null && { capacity: fixture.capacity }),
    occupiedCount: fixture.occupiedCount ?? 0,
    ...(fixture.specBlocks?.length && {
      specBlocks: {
        create: fixture.specBlocks.map((block) => ({
          position: block.position,
          kind: block.kind,
          space: {
            create: {
              width: block.space.width,
              height: block.space.height,
              depth: block.space.depth,
            },
          },
        })),
      },
    }),
  };

  const existing = await prisma.location.findFirst({
    where: { userId, description },
    select: { id: true },
  });

  if (existing) {
    await prisma.locationSpecBlock.deleteMany({ where: { locationId: existing.id } });
    return prisma.location.update({
      where: { id: existing.id },
      data: {
        name: fixture.name,
        environmentTagId,
        environmentGroupSlug: legacy.environmentGroupSlug,
        type: legacy.type,
        subType: legacy.subType,
        seatLayoutMode: fixture.seatLayoutMode,
        ...(fixture.dimensions != null && { dimensions: fixture.dimensions }),
        ...(fixture.layoutMeta != null && { layoutMeta: fixture.layoutMeta }),
        ...(fixture.wateringType != null && { wateringType: fixture.wateringType }),
        ...(fixture.capacity != null && { capacity: fixture.capacity }),
        occupiedCount: fixture.occupiedCount ?? 0,
        ...(fixture.specBlocks?.length && {
          specBlocks: {
            create: fixture.specBlocks.map((block) => ({
              position: block.position,
              kind: block.kind,
              space: {
                create: {
                  width: block.space.width,
                  height: block.space.height,
                  depth: block.space.depth,
                },
              },
            })),
          },
        }),
      },
    });
  }

  return prisma.location.create({ data });
}

async function syncDevSeats(
  prisma: PrismaClient,
  locationId: string,
  seats: NonNullable<DevLocationFixture["seats"]>,
) {
  const labels = seats.map((s) => s.label);
  await prisma.seat.updateMany({
    where: {
      locationId,
      status: "active",
      label: { notIn: labels },
    },
    data: { status: "archived" },
  });

  for (const seat of seats) {
    const existing = await prisma.seat.findFirst({
      where: { locationId, label: seat.label, status: "active" },
    });
    if (existing) {
      await prisma.seat.update({
        where: { id: existing.id },
        data: { position: seat.position },
      });
      continue;
    }
    await prisma.seat.create({
      data: {
        locationId,
        label: seat.label,
        position: seat.position,
        status: "active",
      },
    });
  }
}

export async function seedDevLocations(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { email: "user@growingapp.com" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("seedDevLocations: user@growingapp.com not found — run user seed first");
  }

  const tagIdsByKey = await resolveEnvironmentTagIds(
    DEV_LOCATION_FIXTURES.map((f) => f.environmentVariantKey),
  );

  const results: Array<{ slug: string; id: string; seatLayoutMode: SeatLayoutMode }> = [];
  for (const fixture of DEV_LOCATION_FIXTURES) {
    const row = await upsertDevLocation(prisma, user.id, fixture, tagIdsByKey);
    if (fixture.seats?.length) {
      await syncDevSeats(prisma, row.id, fixture.seats);
    }
    results.push({
      slug: fixture.slug,
      id: row.id,
      seatLayoutMode: row.seatLayoutMode,
    });
  }

  return { userId: user.id, locations: results };
}

async function runCli(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const result = await seedDevLocations(prisma);
    console.log("Dev locations seed completed:", result);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
