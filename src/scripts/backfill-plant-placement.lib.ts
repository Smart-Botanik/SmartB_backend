/**
 * REW-03-5: map legacy Plant.cultivationUnitId / locationId → placement fields.
 */
import type {
  Plant,
  PlantPlacementStage,
  Prisma,
  PrismaClient,
  SeatLayoutMode,
} from "@prisma/client";

export type PlantPlacementBackfillStats = {
  scanned: number;
  updated: number;
  seated: number;
  queued: number;
  skipped: number;
};

export type PlantPlacementMapping = {
  placementStage: PlantPlacementStage;
  plannedLocationId: string | null;
  currentSeatId: string | null;
  locationId: string | null;
  seatIdToAssign: string | null;
};

export function resolvePlantTargetLocationId(plant: {
  locationId: string | null;
  cultivationUnit: { primaryLocationId: string | null } | null;
}): string | null {
  return plant.locationId ?? plant.cultivationUnit?.primaryLocationId ?? null;
}

export function buildPlantPlacementMapping(params: {
  location: {
    id: string;
    seatLayoutMode: SeatLayoutMode;
  };
  freeSeats: Array<{ id: string; label: string }>;
}): Omit<PlantPlacementMapping, "locationId"> & { locationId: string } {
  const { location, freeSeats } = params;

  if (location.seatLayoutMode === "simple_counter") {
    return {
      placementStage: "seated",
      plannedLocationId: null,
      currentSeatId: null,
      locationId: location.id,
      seatIdToAssign: null,
    };
  }

  if (freeSeats.length > 0) {
    const seat = freeSeats[0]!;
    return {
      placementStage: "seated",
      plannedLocationId: null,
      currentSeatId: seat.id,
      locationId: location.id,
      seatIdToAssign: seat.id,
    };
  }

  return {
    placementStage: "ready_to_plant",
    plannedLocationId: location.id,
    currentSeatId: null,
    locationId: location.id,
    seatIdToAssign: null,
  };
}

export function plantNeedsPlacementBackfill(
  plant: Pick<Plant, "placementStage" | "cultivationUnitId" | "locationId">,
): boolean {
  if (plant.placementStage !== "none") {
    return false;
  }
  return plant.cultivationUnitId != null || plant.locationId != null;
}

export async function backfillPlantPlacements(params: {
  prisma: PrismaClient;
  dryRun: boolean;
  plantId?: string;
}): Promise<PlantPlacementBackfillStats> {
  const stats: PlantPlacementBackfillStats = {
    scanned: 0,
    updated: 0,
    seated: 0,
    queued: 0,
    skipped: 0,
  };

  const plants = await params.prisma.plant.findMany({
    where: {
      ...(params.plantId ? { id: params.plantId } : {}),
      placementStage: "none",
      OR: [{ cultivationUnitId: { not: null } }, { locationId: { not: null } }],
    },
    include: {
      cultivationUnit: { select: { primaryLocationId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const plant of plants) {
    stats.scanned += 1;

    if (!plantNeedsPlacementBackfill(plant)) {
      stats.skipped += 1;
      continue;
    }

    const targetLocationId = resolvePlantTargetLocationId(plant);
    if (!targetLocationId) {
      stats.skipped += 1;
      console.log(`[skip:no-location] plant ${plant.id}`);
      continue;
    }

    const location = await params.prisma.location.findUnique({
      where: { id: targetLocationId },
      select: { id: true, seatLayoutMode: true },
    });
    if (!location) {
      stats.skipped += 1;
      console.log(`[skip:missing-location] plant ${plant.id} → ${targetLocationId}`);
      continue;
    }

    const freeSeats = await params.prisma.seat.findMany({
      where: {
        locationId: location.id,
        status: "active",
        plantId: null,
      },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    });

    const mapping = buildPlantPlacementMapping({ location, freeSeats });

    if (params.dryRun) {
      stats.updated += 1;
      if (mapping.placementStage === "seated") stats.seated += 1;
      if (mapping.placementStage === "ready_to_plant") stats.queued += 1;
      console.log(
        `[dry-run] plant ${plant.id} → ${mapping.placementStage} @ ${location.id}` +
          (mapping.seatIdToAssign ? ` seat ${mapping.seatIdToAssign}` : ""),
      );
      continue;
    }

    await params.prisma.$transaction(async (tx) => {
      if (mapping.seatIdToAssign) {
        const seat = await tx.seat.findUnique({
          where: { id: mapping.seatIdToAssign },
          select: { plantId: true },
        });
        if (seat?.plantId) {
          throw new Error(`seat ${mapping.seatIdToAssign} became occupied during backfill`);
        }
        await tx.seat.update({
          where: { id: mapping.seatIdToAssign },
          data: { plantId: plant.id },
        });
      }

      await tx.plant.update({
        where: { id: plant.id },
        data: {
          placementStage: mapping.placementStage,
          plannedLocationId: mapping.plannedLocationId,
          currentSeatId: mapping.currentSeatId,
          locationId: mapping.locationId,
        },
      });
    });

    stats.updated += 1;
    if (mapping.placementStage === "seated") stats.seated += 1;
    if (mapping.placementStage === "ready_to_plant") stats.queued += 1;
    console.log(
      `[ok] plant ${plant.id} → ${mapping.placementStage} @ ${location.id}` +
        (mapping.seatIdToAssign ? ` seat ${mapping.seatIdToAssign}` : ""),
    );
  }

  return stats;
}

export type PlantPlacementCliOptions = {
  dryRun: boolean;
  plantId?: string;
};

export function parsePlantPlacementCliArgs(argv: string[]): PlantPlacementCliOptions {
  let dryRun = false;
  let plantId: string | undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--plant-id=")) {
      plantId = arg.slice("--plant-id=".length).trim() || undefined;
    }
  }

  return { dryRun, plantId };
}
