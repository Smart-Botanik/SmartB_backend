import type { Plant, PlantPlacementStage, Prisma } from "@prisma/client";

export type MetricPlantSource = "direct_attach" | "location_implicit";

export type MetricPlantPlacementContext = {
  plant: Plant;
  placementStage: PlantPlacementStage;
  locationId: string | null;
  locationName: string | null;
  seatId: string | null;
  seatLabel: string | null;
  stageLabel: string;
  source: MetricPlantSource;
};

export type MetricPlantProjection = {
  planned: MetricPlantPlacementContext[];
  readyToPlant: MetricPlantPlacementContext[];
  seated: MetricPlantPlacementContext[];
  withoutLocation: MetricPlantPlacementContext[];
};

type PlantWithPlacement = Plant & {
  plannedLocation?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  currentSeat?: {
    id: string;
    label: string;
    location?: { id: string; name: string } | null;
  } | null;
};

function stageLabelFor(stage: PlantPlacementStage, seatLabel?: string | null): string {
  switch (stage) {
    case "planned":
      return "Planned";
    case "ready_to_plant":
      return "Ready to plant";
    case "seated":
      return seatLabel ? `Seated · ${seatLabel}` : "Seated";
    default:
      return "No location";
  }
}

function resolveLocationContext(plant: PlantWithPlacement): {
  locationId: string | null;
  locationName: string | null;
} {
  if (plant.placementStage === "seated" && plant.currentSeat?.location) {
    return {
      locationId: plant.currentSeat.location.id,
      locationName: plant.currentSeat.location.name,
    };
  }
  if (
    (plant.placementStage === "planned" || plant.placementStage === "ready_to_plant") &&
    plant.plannedLocation
  ) {
    return {
      locationId: plant.plannedLocation.id,
      locationName: plant.plannedLocation.name,
    };
  }
  if (plant.location) {
    return { locationId: plant.location.id, locationName: plant.location.name };
  }
  return { locationId: null, locationName: null };
}

export function buildMetricPlantProjection(params: {
  plants: PlantWithPlacement[];
  directPlantIds: Set<string>;
}): MetricPlantProjection {
  const projection: MetricPlantProjection = {
    planned: [],
    readyToPlant: [],
    seated: [],
    withoutLocation: [],
  };

  const seen = new Set<string>();
  for (const plant of params.plants) {
    if (seen.has(plant.id)) continue;
    seen.add(plant.id);

    const source: MetricPlantSource = params.directPlantIds.has(plant.id)
      ? "direct_attach"
      : "location_implicit";
    const { locationId, locationName } = resolveLocationContext(plant);
    const seatId = plant.placementStage === "seated" ? (plant.currentSeat?.id ?? null) : null;
    const seatLabel = plant.placementStage === "seated" ? (plant.currentSeat?.label ?? null) : null;

    const ctx: MetricPlantPlacementContext = {
      plant,
      placementStage: plant.placementStage,
      locationId,
      locationName,
      seatId,
      seatLabel,
      stageLabel: stageLabelFor(plant.placementStage, seatLabel),
      source,
    };

    switch (plant.placementStage) {
      case "planned":
        projection.planned.push(ctx);
        break;
      case "ready_to_plant":
        projection.readyToPlant.push(ctx);
        break;
      case "seated":
        projection.seated.push(ctx);
        break;
      default:
        projection.withoutLocation.push(ctx);
        break;
    }
  }

  return projection;
}

export const metricPlantProjectionInclude = {
  plannedLocation: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  currentSeat: {
    include: {
      location: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.PlantInclude;
