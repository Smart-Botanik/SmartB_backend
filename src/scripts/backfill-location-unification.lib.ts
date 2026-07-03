/**
 * REW-03: CultivationUnit → unified Location backfill helpers.
 */
import {
  LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY,
  environmentGroupSlugFromVariantKey,
} from "@growing/contracts";
import type {
  CultivationUnit,
  CultivationUnitPlacement,
  CultivationUnitPlacementRole,
  CultivationUnitSpecBlock,
  Location,
  LocationSubType,
  LocationType,
  Prisma,
  PrismaClient,
  SeatLayoutMode,
} from "@prisma/client";
import {
  buildLocationSpecBlockCreates,
  type SpecBlockInput,
} from "../modules/cultivation-units/spec-blocks.util";
import type { CreateSeatInput } from "../modules/locations/seat.util";
import { buildSeatCreateInputs } from "../modules/locations/seat.util";

export const REW003_BACKFILL_KEY = "_rew003";
export const REW003_BACKFILL_VERSION = 1;

export type Rew003BackfillMarker = {
  version: typeof REW003_BACKFILL_VERSION;
  /** @deprecated use cultivationUnitIds */
  cultivationUnitId?: string;
  cultivationUnitIds: string[];
  backfilledAt: string;
};

export type CultivationUnitWithRelations = CultivationUnit & {
  placements: CultivationUnitPlacement[];
  specBlocks: Array<
    CultivationUnitSpecBlock & {
      lighting: { vegetationLamps: unknown; bloomLamps: unknown } | null;
      enclosure: {
        productId: string | null;
        width: number | null;
        height: number | null;
        depth: number | null;
      } | null;
      space: {
        width: number | null;
        height: number | null;
        depth: number | null;
      } | null;
      area: { width: number | null; depth: number | null } | null;
    }
  >;
  primaryLocation: (Location & { specBlocks: { id: string }[]; seats: { id: string }[] }) | null;
};

export const cultivationUnitUnificationInclude = {
  placements: { orderBy: { sortOrder: "asc" as const } },
  specBlocks: {
    orderBy: { position: "asc" as const },
    include: {
      lighting: true,
      enclosure: true,
      space: true,
      area: true,
    },
  },
  primaryLocation: {
    include: {
      specBlocks: { select: { id: true } },
      seats: { where: { status: "active" }, select: { id: true } },
    },
  },
} satisfies Prisma.CultivationUnitInclude;

export type MultiPlacementIssue = {
  cultivationUnitId: string;
  cultivationUnitName: string;
  code: "shared_role" | "multiple_primary" | "orphan_no_location";
  detail: string;
};

export type CuToLocationMapping = {
  targetLocationId: string;
  environmentTagId: string | null;
  environmentGroupSlug: string | null;
  type: LocationType | null;
  subType: LocationSubType | null;
  seatLayoutMode: SeatLayoutMode;
  capacity: number | null;
  occupiedCount: number;
  layoutMeta: Prisma.InputJsonValue | null;
  seatCreates: Prisma.SeatCreateWithoutLocationInput[];
  specBlockCreates: Prisma.LocationSpecBlockCreateWithoutLocationInput[];
};

export function parseRew003Marker(current: unknown): Rew003BackfillMarker | null {
  if (current == null || typeof current !== "object" || Array.isArray(current)) {
    return null;
  }
  const raw = (current as Record<string, unknown>)[REW003_BACKFILL_KEY];
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const marker = raw as Partial<Rew003BackfillMarker>;
  if (
    marker.version !== REW003_BACKFILL_VERSION ||
    typeof marker.backfilledAt !== "string"
  ) {
    return null;
  }
  const ids = marker.cultivationUnitIds?.length
    ? marker.cultivationUnitIds
    : typeof marker.cultivationUnitId === "string"
      ? [marker.cultivationUnitId]
      : null;
  if (!ids?.length) {
    return null;
  }
  return { ...marker, cultivationUnitIds: ids } as Rew003BackfillMarker;
}

export function markerIncludesUnit(marker: Rew003BackfillMarker, unitId: string): boolean {
  return marker.cultivationUnitIds.includes(unitId);
}

export function mergeRew003Marker(
  current: unknown,
  cultivationUnitId: string,
): Prisma.InputJsonValue {
  const existing = parseRew003Marker(current);
  const cultivationUnitIds = existing
    ? [...new Set([...existing.cultivationUnitIds, cultivationUnitId])]
    : [cultivationUnitId];
  const base =
    current != null && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  const marker: Rew003BackfillMarker = {
    version: REW003_BACKFILL_VERSION,
    cultivationUnitIds,
    backfilledAt: new Date().toISOString(),
  };
  return {
    ...base,
    [REW003_BACKFILL_KEY]: marker,
  } as Prisma.InputJsonValue;
}

export function detectMultiPlacementIssues(
  unit: Pick<CultivationUnit, "id" | "name" | "primaryLocationId"> & {
    placements: Pick<CultivationUnitPlacement, "role" | "locationId">[];
  },
): MultiPlacementIssue | null {
  const shared = unit.placements.filter((p) => p.role === ("shared" as CultivationUnitPlacementRole));
  if (shared.length > 0) {
    return {
      cultivationUnitId: unit.id,
      cultivationUnitName: unit.name,
      code: "shared_role",
      detail: `${shared.length} placement(s) with role=shared`,
    };
  }

  const primaries = unit.placements.filter((p) => p.role === "primary");
  if (primaries.length > 1) {
    return {
      cultivationUnitId: unit.id,
      cultivationUnitName: unit.name,
      code: "multiple_primary",
      detail: `${primaries.length} primary placements`,
    };
  }

  const targetId = resolveTargetLocationId(unit);
  if (!targetId) {
    return {
      cultivationUnitId: unit.id,
      cultivationUnitName: unit.name,
      code: "orphan_no_location",
      detail: "no primaryLocationId and no primary placement",
    };
  }

  return null;
}

export function resolveTargetLocationId(
  unit: Pick<CultivationUnit, "primaryLocationId"> & {
    placements: Pick<CultivationUnitPlacement, "role" | "locationId">[];
  },
): string | null {
  if (unit.primaryLocationId) {
    return unit.primaryLocationId;
  }
  const primaryPlacement = unit.placements.find((p) => p.role === "primary");
  return primaryPlacement?.locationId ?? null;
}

export function inferSeatLayoutMode(params: {
  type: LocationType | null;
  subType: LocationSubType | null;
  capacity: number | null;
}): SeatLayoutMode {
  const { type, subType, capacity } = params;
  if (type === "outdoor" || (subType != null && subType.startsWith("outdoor_"))) {
    return "unlimited";
  }
  if (capacity != null && capacity >= 1 && capacity <= 64) {
    const gridSubTypes: LocationSubType[] = [
      "indoor_growbox",
      "indoor_cabinet",
      "greenhouse_classic",
      "greenhouse_tunnel",
    ];
    if (subType != null && gridSubTypes.includes(subType)) {
      return "fixed_grid";
    }
  }
  return "simple_counter";
}

export function generateFixedGridSeatInputs(capacity: number): CreateSeatInput[] {
  const count = Math.max(1, Math.min(capacity, 64));
  const cols = Math.min(count, 8);
  const seats: CreateSeatInput[] = [];
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const label = `${String.fromCharCode(65 + row)}${col + 1}`;
    seats.push({ label, position: { row, col } });
  }
  return seats;
}

export function buildLayoutMetaForCapacity(capacity: number): Prisma.InputJsonValue {
  const count = Math.max(1, Math.min(capacity, 64));
  const gridCols = Math.min(count, 8);
  const gridRows = Math.ceil(count / gridCols);
  return { gridCols, gridRows } as Prisma.InputJsonValue;
}

export function mapCuSpecBlocksToInput(
  specBlocks: CultivationUnitWithRelations["specBlocks"],
): SpecBlockInput[] {
  return specBlocks.map((block) => {
    const base = { position: block.position, kind: block.kind };
    switch (block.kind) {
      case "lighting":
        return {
          ...base,
          lighting: {
            vegetationLamps: block.lighting?.vegetationLamps ?? undefined,
            bloomLamps: block.lighting?.bloomLamps ?? undefined,
          },
        };
      case "enclosure":
        return {
          ...base,
          enclosure: {
            productId: block.enclosure?.productId ?? undefined,
            width: block.enclosure?.width ?? undefined,
            height: block.enclosure?.height ?? undefined,
            depth: block.enclosure?.depth ?? undefined,
          },
        };
      case "space":
        return {
          ...base,
          space: {
            width: block.space?.width ?? undefined,
            height: block.space?.height ?? undefined,
            depth: block.space?.depth ?? undefined,
          },
        };
      case "area":
        return {
          ...base,
          area: {
            width: block.area?.width ?? undefined,
            depth: block.area?.depth ?? undefined,
          },
        };
      default:
        throw new Error(`Unknown spec block kind: ${block.kind}`);
    }
  });
}

export function resolveEnvironmentTagIdFromLegacy(params: {
  type: LocationType | null;
  subType: LocationSubType | null;
  tagIdsByVariantKey: Map<string, string>;
}): {
  environmentTagId: string | null;
  environmentGroupSlug: string | null;
} {
  const { subType, tagIdsByVariantKey } = params;
  if (!subType) {
    return { environmentTagId: null, environmentGroupSlug: null };
  }
  const variantKey = LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY[subType];
  if (!variantKey) {
    return { environmentTagId: null, environmentGroupSlug: null };
  }
  const environmentTagId = tagIdsByVariantKey.get(variantKey) ?? null;
  const environmentGroupSlug = environmentGroupSlugFromVariantKey(variantKey);
  return { environmentTagId, environmentGroupSlug };
}

export function buildCuToLocationMapping(params: {
  unit: CultivationUnitWithRelations;
  location: NonNullable<CultivationUnitWithRelations["primaryLocation"]>;
  tagIdsByVariantKey: Map<string, string>;
}): CuToLocationMapping {
  const { unit, location, tagIdsByVariantKey } = params;

  const type = location.type ?? unit.type;
  const subType = location.subType ?? unit.subType;
  const capacity = location.capacity ?? unit.capacity;
  const occupiedSlots = location.occupiedSlots ?? unit.occupiedSlots ?? 0;

  const envFromLocation = location.environmentTagId
    ? {
        environmentTagId: location.environmentTagId,
        environmentGroupSlug: location.environmentGroupSlug,
      }
    : resolveEnvironmentTagIdFromLegacy({ type, subType, tagIdsByVariantKey });

  const seatLayoutMode =
    location.seatLayoutMode !== "simple_counter" || location.seats.length > 0
      ? location.seatLayoutMode
      : inferSeatLayoutMode({ type, subType, capacity });

  let seatCreates: Prisma.SeatCreateWithoutLocationInput[] = [];
  let layoutMeta: Prisma.InputJsonValue | null = location.layoutMeta as Prisma.InputJsonValue | null;

  if (
    seatLayoutMode === "fixed_grid" &&
    location.seats.length === 0 &&
    capacity != null &&
    capacity >= 1
  ) {
    const seatInputs = generateFixedGridSeatInputs(capacity);
    seatCreates = buildSeatCreateInputs(seatInputs, "fixed_grid");
    if (layoutMeta == null) {
      layoutMeta = buildLayoutMetaForCapacity(capacity);
    }
  }

  const specBlockCreates =
    location.specBlocks.length === 0 && unit.specBlocks.length > 0
      ? buildLocationSpecBlockCreates(mapCuSpecBlocksToInput(unit.specBlocks))
      : [];

  return {
    targetLocationId: location.id,
    environmentTagId: envFromLocation.environmentTagId,
    environmentGroupSlug: envFromLocation.environmentGroupSlug,
    type,
    subType,
    seatLayoutMode,
    capacity,
    occupiedCount: Math.max(0, occupiedSlots),
    layoutMeta,
    seatCreates,
    specBlockCreates,
  };
}

export type OrphanLocationProvisionResult = {
  locationId: string;
  created: boolean;
};

export type UnificationCliOptions = {
  dryRun: boolean;
  cultivationUnitId?: string;
  skipTaxonomy: boolean;
  skipOrphanProvision: boolean;
};

export function isOrphanCultivationUnit(
  unit: Pick<CultivationUnit, "primaryLocationId"> & {
    placements: Pick<CultivationUnitPlacement, "role" | "locationId">[];
  },
): boolean {
  return resolveTargetLocationId(unit) == null;
}

/**
 * Orphan CU (no primaryLocationId / primary placement): create Location from CU fields
 * and wire primaryLocationId + primary placement before unification backfill.
 */
export async function ensureOrphanUnitHasTargetLocation(params: {
  prisma: PrismaClient;
  unit: CultivationUnitWithRelations;
  tagIdsByVariantKey: Map<string, string>;
  dryRun: boolean;
}): Promise<OrphanLocationProvisionResult | null> {
  const { prisma, unit, tagIdsByVariantKey, dryRun } = params;

  if (!isOrphanCultivationUnit(unit)) {
    return null;
  }

  const placementIssue = detectMultiPlacementIssues(unit);
  if (placementIssue && placementIssue.code !== "orphan_no_location") {
    return null;
  }

  const type = unit.type;
  const subType = unit.subType;
  const capacity = unit.capacity;
  const { environmentTagId, environmentGroupSlug } = resolveEnvironmentTagIdFromLegacy({
    type,
    subType,
    tagIdsByVariantKey,
  });
  const seatLayoutMode = inferSeatLayoutMode({ type, subType, capacity });
  const specBlockCreates =
    unit.specBlocks.length > 0
      ? buildLocationSpecBlockCreates(mapCuSpecBlocksToInput(unit.specBlocks))
      : [];

  let layoutMeta: Prisma.InputJsonValue | null = null;
  let seatCreates: Prisma.SeatCreateWithoutLocationInput[] = [];
  if (
    seatLayoutMode === "fixed_grid" &&
    capacity != null &&
    capacity >= 1
  ) {
    seatCreates = buildSeatCreateInputs(generateFixedGridSeatInputs(capacity), "fixed_grid");
    layoutMeta = buildLayoutMetaForCapacity(capacity);
  }

  if (dryRun) {
    return { locationId: `dry-run-location-for-${unit.id}`, created: true };
  }

  const location = await prisma.$transaction(async (tx) => {
    const created = await tx.location.create({
      data: {
        userId: unit.userId,
        name: unit.name,
        type,
        subType,
        capacity,
        environmentTagId,
        environmentGroupSlug,
        seatLayoutMode,
        layoutMeta: layoutMeta ?? undefined,
        occupiedCount: Math.max(0, unit.occupiedSlots ?? 0),
        ...(specBlockCreates.length > 0 && {
          specBlocks: { create: specBlockCreates },
        }),
        ...(seatCreates.length > 0 && {
          seats: { create: seatCreates },
        }),
      },
    });

    await tx.cultivationUnit.update({
      where: { id: unit.id },
      data: { primaryLocationId: created.id },
    });

    await tx.cultivationUnitPlacement.create({
      data: {
        cultivationUnitId: unit.id,
        locationId: created.id,
        role: "primary",
        sortOrder: 0,
      },
    });

    return created;
  });

  return { locationId: location.id, created: true };
}

/** In-memory patch so dry-run can continue unification preview after orphan provision. */
export function patchUnitWithSyntheticOrphanLocation(
  unit: CultivationUnitWithRelations,
  locationId: string,
): CultivationUnitWithRelations {
  const syntheticLocation = {
    id: locationId,
    userId: unit.userId,
    name: unit.name,
    type: unit.type,
    subType: unit.subType,
    capacity: unit.capacity,
    occupiedSlots: unit.occupiedSlots,
    environmentTagId: null,
    environmentGroupSlug: null,
    seatLayoutMode: inferSeatLayoutMode({
      type: unit.type,
      subType: unit.subType,
      capacity: unit.capacity,
    }),
    layoutMeta: null,
    current: null,
    specBlocks: [],
    seats: [],
  } as unknown as NonNullable<CultivationUnitWithRelations["primaryLocation"]>;

  return {
    ...unit,
    primaryLocationId: locationId,
    primaryLocation: syntheticLocation,
    placements: [
      ...unit.placements,
      {
        id: `dry-run-placement-${unit.id}`,
        cultivationUnitId: unit.id,
        locationId,
        role: "primary" as CultivationUnitPlacementRole,
        sortOrder: 0,
        createdAt: unit.createdAt,
      },
    ],
  };
}

export function parseUnificationCliArgs(argv: string[]): UnificationCliOptions {
  let dryRun = false;
  let skipTaxonomy = false;
  let skipOrphanProvision = false;
  let cultivationUnitId: string | undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--skip-taxonomy") {
      skipTaxonomy = true;
      continue;
    }
    if (arg === "--skip-orphan-provision") {
      skipOrphanProvision = true;
      continue;
    }
    if (arg.startsWith("--cultivation-unit-id=")) {
      cultivationUnitId = arg.slice("--cultivation-unit-id=".length).trim() || undefined;
    }
  }

  return { dryRun, cultivationUnitId, skipTaxonomy, skipOrphanProvision };
}

export function locationNeedsUnification(
  location: Pick<
    Location,
    "environmentTagId" | "seatLayoutMode" | "current"
  > & {
    specBlocks: { id: string }[];
    seats: { id: string }[];
  },
  unitId: string,
): boolean {
  const marker = parseRew003Marker(location.current);
  if (marker && markerIncludesUnit(marker, unitId)) {
    return false;
  }
  return (
    location.environmentTagId == null ||
    (location.seatLayoutMode === "simple_counter" &&
      location.seats.length === 0 &&
      location.specBlocks.length === 0)
  );
}
