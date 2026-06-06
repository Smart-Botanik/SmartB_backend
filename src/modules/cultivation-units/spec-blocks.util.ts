import { BadRequestException } from "@nestjs/common";
import { LocationSpecKind, LocationSubType, LocationType, Prisma } from "@prisma/client";

export type SpecBlockInput = {
  position: number;
  kind: LocationSpecKind;
  lighting?: {
    vegetationLamps?: unknown;
    bloomLamps?: unknown;
  } | null;
  enclosure?: {
    productId?: string | null;
    width?: number | null;
    height?: number | null;
    depth?: number | null;
  } | null;
  space?: {
    width?: number | null;
    height?: number | null;
    depth?: number | null;
  } | null;
  area?: {
    width?: number | null;
    depth?: number | null;
  } | null;
};

export function assertTypeSubTypeMatch(
  type: LocationType | null | undefined,
  subType: LocationSubType | null | undefined,
) {
  if (subType != null && type == null) {
    throw new BadRequestException("subType requires type to be set");
  }
  if (type != null && subType != null) {
    const prefix = `${type}_`;
    if (!String(subType).startsWith(prefix)) {
      throw new BadRequestException("subType does not match type");
    }
  }
}

function assertSpecBlockPayload(kind: LocationSpecKind, b: SpecBlockInput) {
  const keyByKind: Record<LocationSpecKind, keyof SpecBlockInput> = {
    lighting: "lighting",
    enclosure: "enclosure",
    space: "space",
    area: "area",
  };
  const expected = keyByKind[kind];
  for (const k of ["lighting", "enclosure", "space", "area"] as const) {
    if (k !== expected && b[k] != null) {
      throw new BadRequestException(
        `specBlocks: kind "${kind}" must not include payload for "${k}"`,
      );
    }
  }
  if (b[expected] == null) {
    throw new BadRequestException(
      `specBlocks: kind "${kind}" requires "${expected}" payload object`,
    );
  }
}

function assertDistinctPositions(blocks: SpecBlockInput[]) {
  const seen = new Set<number>();
  for (const b of blocks) {
    if (seen.has(b.position)) {
      throw new BadRequestException("specBlocks: duplicate position");
    }
    seen.add(b.position);
  }
}

export function validateSpecBlocks(blocks: SpecBlockInput[] | undefined | null) {
  if (!blocks?.length) return;
  for (const b of blocks) {
    assertSpecBlockPayload(b.kind, b);
  }
  assertDistinctPositions(blocks);
}

export function buildLocationSpecBlockCreates(
  blocks: SpecBlockInput[],
): Prisma.LocationSpecBlockCreateWithoutLocationInput[] {
  validateSpecBlocks(blocks);
  return blocks.map((b) => mapSpecBlockCreate(b));
}

export function buildCultivationUnitSpecBlockCreates(
  blocks: SpecBlockInput[],
): Prisma.CultivationUnitSpecBlockCreateWithoutCultivationUnitInput[] {
  validateSpecBlocks(blocks);
  return blocks.map((b) => mapSpecBlockCreate(b));
}

function mapSpecBlockCreate(b: SpecBlockInput) {
  const base = { position: b.position, kind: b.kind };
  switch (b.kind) {
    case "lighting":
      return {
        ...base,
        lighting: {
          create: {
            vegetationLamps: b.lighting?.vegetationLamps as Prisma.InputJsonValue | undefined,
            bloomLamps: b.lighting?.bloomLamps as Prisma.InputJsonValue | undefined,
          },
        },
      };
    case "enclosure":
      return {
        ...base,
        enclosure: {
          create: {
            productId: b.enclosure?.productId ?? undefined,
            width: b.enclosure?.width ?? undefined,
            height: b.enclosure?.height ?? undefined,
            depth: b.enclosure?.depth ?? undefined,
          },
        },
      };
    case "space":
      return {
        ...base,
        space: {
          create: {
            width: b.space?.width ?? undefined,
            height: b.space?.height ?? undefined,
            depth: b.space?.depth ?? undefined,
          },
        },
      };
    case "area":
      return {
        ...base,
        area: {
          create: {
            width: b.area?.width ?? undefined,
            depth: b.area?.depth ?? undefined,
          },
        },
      };
    default:
      throw new BadRequestException("specBlocks: unknown kind");
  }
}
