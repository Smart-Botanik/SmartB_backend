/**
 * Shared helpers for ADR-0011 Location → CultivationUnit backfill.
 */
import type {
  CultivationUnitStatus,
  Location,
  LocationSpecBlock,
  LocationStatus,
  LocationSubType,
  LocationType,
  Prisma,
} from "@prisma/client";
import type { SpecBlockInput } from "../modules/cultivation-units/spec-blocks.util";

export const ADR0011_BACKFILL_KEY = "_adr0011";
export const BACKFILL_UNIT_NAME_SUFFIX = " — основное";
export const BACKFILL_VERSION = 1;

export type Adr0011BackfillMarker = {
  version: typeof BACKFILL_VERSION;
  cultivationUnitId: string;
  backfilledAt: string;
};

export type LocationWithBackfillRelations = Location & {
  specBlocks: Array<
    LocationSpecBlock & {
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
  diaries: { id: string }[];
  _count: { plants: number };
};

export const locationBackfillInclude = {
  specBlocks: {
    orderBy: { position: "asc" as const },
    include: {
      lighting: true,
      enclosure: true,
      space: true,
      area: true,
    },
  },
  diaries: { select: { id: true } },
  _count: { select: { plants: true } },
} satisfies Prisma.LocationInclude;

export function parseBackfillMarker(current: unknown): Adr0011BackfillMarker | null {
  if (current == null || typeof current !== "object" || Array.isArray(current)) {
    return null;
  }
  const raw = (current as Record<string, unknown>)[ADR0011_BACKFILL_KEY];
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const marker = raw as Partial<Adr0011BackfillMarker>;
  if (
    marker.version !== BACKFILL_VERSION ||
    typeof marker.cultivationUnitId !== "string" ||
    typeof marker.backfilledAt !== "string"
  ) {
    return null;
  }
  return marker as Adr0011BackfillMarker;
}

export function mergeBackfillMarker(
  current: unknown,
  cultivationUnitId: string,
): Prisma.InputJsonValue {
  const base =
    current != null && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  const marker: Adr0011BackfillMarker = {
    version: BACKFILL_VERSION,
    cultivationUnitId,
    backfilledAt: new Date().toISOString(),
  };
  return {
    ...base,
    [ADR0011_BACKFILL_KEY]: marker,
  } as Prisma.InputJsonValue;
}

export function defaultCultivationUnitName(locationName: string): string {
  const trimmed = locationName.trim();
  if (trimmed.endsWith(BACKFILL_UNIT_NAME_SUFFIX.trim())) {
    return trimmed;
  }
  return `${trimmed}${BACKFILL_UNIT_NAME_SUFFIX}`;
}

export function mapLocationStatusToUnitStatus(status: LocationStatus): CultivationUnitStatus {
  return status === "archived" ? "archived" : "active";
}

export function locationHasLegacyGrowingProfile(location: LocationWithBackfillRelations): boolean {
  return location.environmentTagId != null || location.specBlocks.length > 0;
}

export function locationEligibleForBackfill(location: LocationWithBackfillRelations): boolean {
  return locationHasLegacyGrowingProfile(location) || location._count.plants > 0;
}

export function mapLocationSpecBlocksToInput(
  specBlocks: LocationWithBackfillRelations["specBlocks"],
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

export type BackfillCliOptions = {
  dryRun: boolean;
  clearLegacy: boolean;
  locationId?: string;
};

export function parseBackfillCliArgs(argv: string[]): BackfillCliOptions {
  let dryRun = false;
  let clearLegacy = false;
  let locationId: string | undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--clear-legacy") {
      clearLegacy = true;
      continue;
    }
    if (arg.startsWith("--location-id=")) {
      locationId = arg.slice("--location-id=".length).trim() || undefined;
    }
  }

  return { dryRun, clearLegacy, locationId };
}

export function legacyFieldsMatch(params: {
  location: Pick<Location, "status" | "occupiedCount" | "environmentTagId">;
  unit: {
    type: LocationType | null;
    subType: LocationSubType | null;
    capacity: number | null;
    occupiedSlots: number | null;
    status: CultivationUnitStatus;
  };
}): boolean {
  const { location, unit } = params;
  return (
    mapLocationStatusToUnitStatus(location.status) === unit.status &&
    Math.max(0, location.occupiedCount) === Math.max(0, unit.occupiedSlots ?? 0)
  );
}
