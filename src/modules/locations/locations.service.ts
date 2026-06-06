import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LocationSpecKind,
  LocationSubType,
  LocationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ProductsService } from "../reference-data/products.service";

/** GraphQL / Prisma — вложенные блоки specs + связи для ответа */
export const locationGraphqlInclude = {
  parent: true,
  children: { orderBy: { name: "asc" as const } },
  plants: { orderBy: { createdAt: "desc" as const } },
  diaries: { orderBy: { createdAt: "desc" as const } },
  cultivationUnitPlacements: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      cultivationUnit: {
        include: {
          specBlocks: {
            orderBy: { position: "asc" as const },
            include: { lighting: true, enclosure: true, space: true, area: true },
          },
        },
      },
    },
  },
  specBlocks: {
    orderBy: { position: "asc" as const },
    include: {
      lighting: true,
      enclosure: true,
      space: true,
      area: true,
    },
  },
} satisfies Prisma.LocationInclude;

export type LocationSpecBlockInput = {
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

function assertTypeSubTypeMatch(
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

function assertSpecBlockPayload(kind: LocationSpecKind, b: LocationSpecBlockInput) {
  const keyByKind: Record<LocationSpecKind, keyof LocationSpecBlockInput> = {
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

function assertDistinctPositions(blocks: LocationSpecBlockInput[]) {
  const seen = new Set<number>();
  for (const b of blocks) {
    if (seen.has(b.position)) {
      throw new BadRequestException("specBlocks: duplicate position");
    }
    seen.add(b.position);
  }
}

function buildSpecBlockCreates(
  blocks: LocationSpecBlockInput[],
): Prisma.LocationSpecBlockCreateWithoutLocationInput[] {
  assertDistinctPositions(blocks);
  return blocks.map((b) => {
    assertSpecBlockPayload(b.kind, b);
    const base = { position: b.position, kind: b.kind };
    switch (b.kind) {
      case "lighting":
        return {
          ...base,
          lighting: {
            create: {
              vegetationLamps: b.lighting?.vegetationLamps as
                | Prisma.InputJsonValue
                | undefined,
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
  });
}

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  private async assertDiariesOwnedByUser(userId: string, diaryIds: string[]) {
    if (diaryIds.length === 0) return;
    const rows = await this.prisma.diary.findMany({
      where: { id: { in: diaryIds }, userId },
      select: { id: true },
    });
    if (rows.length !== diaryIds.length) {
      throw new BadRequestException("diaryIds: one or more diaries not found or not owned");
    }
  }

  private async assertProductExists(productId: string) {
    try {
      await this.productsService.getById(productId);
    } catch {
      throw new BadRequestException("enclosure.productId: product not found");
    }
  }

  private async assertParentLocation(params: {
    userId: string;
    parentLocationId: string;
    locationId?: string;
  }) {
    if (params.locationId && params.parentLocationId === params.locationId) {
      throw new BadRequestException("parentLocationId cannot equal location id");
    }
    const parent = await this.getByIdBare({
      userId: params.userId,
      id: params.parentLocationId,
    });
    if (params.locationId) {
      let cursor: typeof parent | null = parent;
      while (cursor?.parentLocationId) {
        if (cursor.parentLocationId === params.locationId) {
          throw new BadRequestException("parentLocationId would create a cycle");
        }
        cursor = await this.prisma.location.findUnique({
          where: { id: cursor.parentLocationId },
        });
      }
    }
    return parent;
  }

  private async validateSpecBlocksForCreate(blocks: LocationSpecBlockInput[] | undefined) {
    if (!blocks?.length) return;
    for (const b of blocks) {
      if (b.enclosure?.productId) {
        await this.assertProductExists(b.enclosure.productId);
      }
    }
  }

  async list(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.location.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
      include: locationGraphqlInclude,
    });
  }

  async getById(params: { userId: string; id: string }) {
    const row = await this.prisma.location.findUnique({
      where: { id: params.id },
      include: locationGraphqlInclude,
    });
    if (!row) {
      throw new NotFoundException("Location not found");
    }
    if (row.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return row;
  }

  async getByIdBare(params: { userId: string; id: string }) {
    const row = await this.prisma.location.findUnique({ where: { id: params.id } });
    if (!row) {
      throw new NotFoundException("Location not found");
    }
    if (row.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return row;
  }

  async create(params: {
    userId: string;
    name: string;
    parentLocationId?: string | null;
    status?: "active" | "archived" | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics" | null;
    description?: string | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: LocationSpecBlockInput[] | null;
  }) {
    assertTypeSubTypeMatch(params.type ?? undefined, params.subType ?? undefined);
    const blocks = params.specBlocks ?? undefined;
    if (blocks?.length) {
      for (const b of blocks) assertSpecBlockPayload(b.kind, b);
      assertDistinctPositions(blocks);
    }
    await this.validateSpecBlocksForCreate(blocks);
    const diaryIds = params.diaryIds ?? [];
    await this.assertDiariesOwnedByUser(params.userId, diaryIds);
    if (params.parentLocationId) {
      await this.assertParentLocation({
        userId: params.userId,
        parentLocationId: params.parentLocationId,
      });
    }

    return this.prisma.location.create({
      data: {
        userId: params.userId,
        name: params.name,
        ...(params.parentLocationId !== undefined && {
          parentLocationId: params.parentLocationId,
        }),
        ...(params.status != null && { status: params.status }),
        ...(params.type !== undefined && { type: params.type }),
        ...(params.subType !== undefined && { subType: params.subType }),
        ...(params.wateringType !== undefined && { wateringType: params.wateringType }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.capacity !== undefined && { capacity: params.capacity }),
        ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
        ...(diaryIds.length > 0 && {
          diaries: { connect: diaryIds.map((id) => ({ id })) },
        }),
        ...(blocks?.length && {
          specBlocks: { create: buildSpecBlockCreates(blocks) },
        }),
      },
      include: locationGraphqlInclude,
    });
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    parentLocationId?: string | null;
    status?: "active" | "archived" | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics" | null;
    description?: string | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: LocationSpecBlockInput[] | null;
  }) {
    const existing = await this.getByIdBare({ userId: params.userId, id: params.id });

    const nextType = params.type !== undefined ? params.type : existing.type;
    const nextSubType = params.subType !== undefined ? params.subType : existing.subType;
    assertTypeSubTypeMatch(nextType ?? undefined, nextSubType ?? undefined);

    if (params.diaryIds != null) {
      await this.assertDiariesOwnedByUser(params.userId, params.diaryIds);
    }

    if (params.parentLocationId) {
      await this.assertParentLocation({
        userId: params.userId,
        parentLocationId: params.parentLocationId,
        locationId: params.id,
      });
    }

    if (params.specBlocks != null) {
      for (const b of params.specBlocks) assertSpecBlockPayload(b.kind, b);
      assertDistinctPositions(params.specBlocks);
      for (const b of params.specBlocks) {
        if (b.enclosure?.productId) {
          await this.assertProductExists(b.enclosure.productId);
        }
      }
    }

    const scalarData: Prisma.LocationUpdateInput = {
      ...(params.name !== undefined && { name: params.name ?? undefined }),
      ...(params.parentLocationId !== undefined && {
        parentLocationId: params.parentLocationId,
      }),
      ...(params.status !== undefined && { status: params.status ?? undefined }),
      ...(params.type !== undefined && { type: params.type }),
      ...(params.subType !== undefined && { subType: params.subType }),
      ...(params.wateringType !== undefined && { wateringType: params.wateringType }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.capacity !== undefined && { capacity: params.capacity }),
      ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
      ...(params.diaryIds != null && {
        diaries: { set: params.diaryIds.map((id) => ({ id })) },
      }),
    };

    if (params.specBlocks != null) {
      const replacementBlocks = params.specBlocks;
      return this.prisma.$transaction(async (tx) => {
        await tx.locationSpecBlock.deleteMany({ where: { locationId: params.id } });
        return tx.location.update({
          where: { id: params.id },
          data: {
            ...scalarData,
            ...(replacementBlocks.length > 0 && {
              specBlocks: { create: buildSpecBlockCreates(replacementBlocks) },
            }),
          },
          include: locationGraphqlInclude,
        });
      });
    }

    return this.prisma.location.update({
      where: { id: params.id },
      data: scalarData,
      include: locationGraphqlInclude,
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getByIdBare({ userId: params.userId, id: params.id });
    await this.prisma.location.delete({ where: { id: params.id } });
    return true;
  }
}
