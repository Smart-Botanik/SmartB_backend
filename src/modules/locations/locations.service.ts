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
  SeatLayoutMode,
} from "@prisma/client";
import type { FlatTaxonomyTag } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ProductsService } from "../reference-data/products.service";
import { TaxonomyConsumerCatalogService } from "../taxonomy/taxonomy-consumer-catalog.service";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { resolveEnvironmentFieldsFromTag } from "./location-environment.util";
import {
  buildSeatCreateInputs,
  type CreateSeatInput,
} from "./seat.util";

/** GraphQL / Prisma — вложенные блоки specs + связи для ответа */
export const locationGraphqlInclude = {
  parent: true,
  children: { orderBy: { name: "asc" as const } },
  plants: { orderBy: { createdAt: "desc" as const } },
  diaries: { orderBy: { createdAt: "desc" as const } },
  taxonomyTags: true,
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
  seats: {
    where: { status: "active" as const },
    orderBy: { label: "asc" as const },
    include: { taxonomyTags: true },
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
    private readonly taxonomyTagService: TaxonomyTagService,
    private readonly taxonomyConsumerCatalogService: TaxonomyConsumerCatalogService,
  ) {}

  private async assertEnvironmentVariantTagId(tagId: string) {
    const tag = (await this.taxonomyTagService.getById(tagId)) as FlatTaxonomyTag;
    if (tag.namespace !== "ENVIRONMENT_VARIANT" || (tag.status ?? "ACTIVE") !== "ACTIVE") {
      throw new BadRequestException("environmentTagId: invalid environment variant tag");
    }
    const catalog = await this.taxonomyConsumerCatalogService.getCatalog("location_environment");
    if (!catalog.options.some((o) => o.id === tagId)) {
      throw new BadRequestException("environmentTagId: tag not in environment catalog");
    }
    return tag;
  }

  private async assertFeatureTaxonomyTagIds(tagIds: string[]) {
    if (tagIds.length === 0) return;
    const unique = [...new Set(tagIds)];
    for (const id of unique) {
      try {
        await this.taxonomyTagService.getById(id);
      } catch {
        throw new BadRequestException(`taxonomyTagIds: tag not found: ${id}`);
      }
    }
  }

  private async resolveEnvironmentInput(params: {
    environmentTagId?: string | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
  }) {
    const tagId = params.environmentTagId?.trim() || null;
    if (tagId) {
      const tag = await this.assertEnvironmentVariantTagId(tagId);
      return resolveEnvironmentFieldsFromTag(tag);
    }
    assertTypeSubTypeMatch(params.type ?? undefined, params.subType ?? undefined);
    return {
      environmentTagId: null as string | null,
      environmentGroupSlug: null as string | null,
      type: params.type ?? null,
      subType: params.subType ?? null,
    };
  }

  private async assertSeatTaxonomyTagIds(tagIds: string[]) {
    await this.assertFeatureTaxonomyTagIds(tagIds);
  }

  private async assertSeatsInput(params: {
    seats: CreateSeatInput[];
    seatLayoutMode: SeatLayoutMode;
  }) {
    if (params.seats.length === 0) return;
    if (params.seatLayoutMode === "simple_counter") {
      throw new BadRequestException(
        "seats: bulk create not allowed for simple_counter mode",
      );
    }
    for (const seat of params.seats) {
      await this.assertSeatTaxonomyTagIds(seat.taxonomyTagIds ?? []);
    }
    buildSeatCreateInputs(params.seats, params.seatLayoutMode);
  }

  async computeOccupiedCount(locationId: string): Promise<number> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { seatLayoutMode: true },
    });
    if (!location) return 0;

    if (location.seatLayoutMode === "simple_counter") {
      return this.prisma.plant.count({ where: { locationId } });
    }

    return this.prisma.seat.count({
      where: {
        locationId,
        status: "active",
        plantId: { not: null },
      },
    });
  }

  private async syncOccupiedCount(locationId: string) {
    const occupiedCount = await this.computeOccupiedCount(locationId);
    await this.prisma.location.update({
      where: { id: locationId },
      data: { occupiedCount },
    });
    return occupiedCount;
  }

  async refreshOccupiedCount(locationId: string): Promise<number> {
    return this.syncOccupiedCount(locationId);
  }

  private async replaceSeats(params: {
    locationId: string;
    seatLayoutMode: SeatLayoutMode;
    seats: CreateSeatInput[];
  }) {
    await this.assertSeatsInput({
      seats: params.seats,
      seatLayoutMode: params.seatLayoutMode,
    });

    const creates = buildSeatCreateInputs(params.seats, params.seatLayoutMode);

    await this.prisma.$transaction(async (tx) => {
      await tx.seat.updateMany({
        where: { locationId: params.locationId, status: "active" },
        data: { status: "archived" },
      });

      for (const seat of creates) {
        await tx.seat.create({
          data: {
            locationId: params.locationId,
            label: seat.label,
            width: seat.width ?? undefined,
            depth: seat.depth ?? undefined,
            height: seat.height ?? undefined,
            position: seat.position ?? undefined,
            ...(seat.taxonomyTags && { taxonomyTags: seat.taxonomyTags }),
          },
        });
      }
    });

    await this.syncOccupiedCount(params.locationId);
  }

  private async createSeatsForLocation(params: {
    locationId: string;
    seatLayoutMode: SeatLayoutMode;
    seats: CreateSeatInput[];
  }) {
    if (params.seats.length === 0) return;
    await this.assertSeatsInput({
      seats: params.seats,
      seatLayoutMode: params.seatLayoutMode,
    });
    const creates = buildSeatCreateInputs(params.seats, params.seatLayoutMode);
    for (const seat of creates) {
      await this.prisma.seat.create({
        data: {
          locationId: params.locationId,
          label: seat.label,
          width: seat.width ?? undefined,
          depth: seat.depth ?? undefined,
          height: seat.height ?? undefined,
          position: seat.position ?? undefined,
          ...(seat.taxonomyTags && { taxonomyTags: seat.taxonomyTags }),
        },
      });
    }
    await this.syncOccupiedCount(params.locationId);
  }

  private buildTaxonomyTagCreates(tagIds: string[] | undefined) {
    if (!tagIds?.length) return undefined;
    return {
      create: tagIds.map((taxonomyTagId) => ({ taxonomyTagId })),
    };
  }

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
    environmentTagId?: string | null;
    dimensions?: Prisma.InputJsonValue | null;
    seatLayoutMode?: SeatLayoutMode | null;
    layoutMeta?: Prisma.InputJsonValue | null;
    taxonomyTagIds?: string[] | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics" | null;
    description?: string | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: LocationSpecBlockInput[] | null;
    seats?: CreateSeatInput[] | null;
  }) {
    const env = await this.resolveEnvironmentInput({
      environmentTagId: params.environmentTagId,
      type: params.type,
      subType: params.subType,
    });
    const featureTagIds = params.taxonomyTagIds ?? [];
    await this.assertFeatureTaxonomyTagIds(featureTagIds);
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

    const seatLayoutMode = params.seatLayoutMode ?? SeatLayoutMode.simple_counter;
    const seats = params.seats ?? [];

    const created = await this.prisma.location.create({
      data: {
        userId: params.userId,
        name: params.name,
        ...(params.parentLocationId !== undefined && {
          parentLocationId: params.parentLocationId,
        }),
        ...(params.status != null && { status: params.status }),
        environmentTagId: env.environmentTagId,
        environmentGroupSlug: env.environmentGroupSlug,
        type: env.type,
        subType: env.subType,
        ...(params.dimensions !== undefined && {
          dimensions:
            params.dimensions === null
              ? Prisma.JsonNull
              : (params.dimensions as Prisma.InputJsonValue),
        }),
        seatLayoutMode,
        ...(params.layoutMeta !== undefined && {
          layoutMeta:
            params.layoutMeta === null
              ? Prisma.JsonNull
              : (params.layoutMeta as Prisma.InputJsonValue),
        }),
        ...(params.wateringType !== undefined && { wateringType: params.wateringType }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.capacity !== undefined && { capacity: params.capacity }),
        ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
        ...(diaryIds.length > 0 && {
          diaries: { connect: diaryIds.map((id) => ({ id })) },
        }),
        ...(featureTagIds.length > 0 && {
          taxonomyTags: this.buildTaxonomyTagCreates(featureTagIds),
        }),
        ...(blocks?.length && {
          specBlocks: { create: buildSpecBlockCreates(blocks) },
        }),
      },
      include: locationGraphqlInclude,
    });

    if (seats.length > 0) {
      await this.createSeatsForLocation({
        locationId: created.id,
        seatLayoutMode,
        seats,
      });
      return this.getById({ userId: params.userId, id: created.id });
    }

    return created;
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    parentLocationId?: string | null;
    status?: "active" | "archived" | null;
    environmentTagId?: string | null;
    dimensions?: Prisma.InputJsonValue | null;
    seatLayoutMode?: SeatLayoutMode | null;
    layoutMeta?: Prisma.InputJsonValue | null;
    taxonomyTagIds?: string[] | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics" | null;
    description?: string | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: LocationSpecBlockInput[] | null;
    seats?: CreateSeatInput[] | null;
  }) {
    const existing = await this.getByIdBare({ userId: params.userId, id: params.id });

    const env =
      params.environmentTagId !== undefined ||
      params.type !== undefined ||
      params.subType !== undefined
        ? await this.resolveEnvironmentInput({
            environmentTagId:
              params.environmentTagId !== undefined
                ? params.environmentTagId
                : existing.environmentTagId,
            type: params.type !== undefined ? params.type : existing.type,
            subType: params.subType !== undefined ? params.subType : existing.subType,
          })
        : null;

    if (params.taxonomyTagIds != null) {
      await this.assertFeatureTaxonomyTagIds(params.taxonomyTagIds);
    }

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
      ...(env != null && {
        environmentTagId: env.environmentTagId,
        environmentGroupSlug: env.environmentGroupSlug,
        type: env.type,
        subType: env.subType,
      }),
      ...(params.dimensions !== undefined && {
        dimensions:
          params.dimensions === null
            ? Prisma.JsonNull
            : (params.dimensions as Prisma.InputJsonValue),
      }),
      ...(params.seatLayoutMode != null && { seatLayoutMode: params.seatLayoutMode }),
      ...(params.layoutMeta !== undefined && {
        layoutMeta:
          params.layoutMeta === null
            ? Prisma.JsonNull
            : (params.layoutMeta as Prisma.InputJsonValue),
      }),
      ...(params.wateringType !== undefined && { wateringType: params.wateringType }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.capacity !== undefined && { capacity: params.capacity }),
      ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
      ...(params.diaryIds != null && {
        diaries: { set: params.diaryIds.map((id) => ({ id })) },
      }),
      ...(params.taxonomyTagIds != null && {
        taxonomyTags: {
          deleteMany: {},
          ...(params.taxonomyTagIds.length > 0 && {
            create: params.taxonomyTagIds.map((taxonomyTagId) => ({ taxonomyTagId })),
          }),
        },
      }),
    };

    if (params.specBlocks != null) {
      const replacementBlocks = params.specBlocks;
      return this.prisma.$transaction(async (tx) => {
        await tx.locationSpecBlock.deleteMany({ where: { locationId: params.id } });
        const updated = await tx.location.update({
          where: { id: params.id },
          data: {
            ...scalarData,
            ...(replacementBlocks.length > 0 && {
              specBlocks: { create: buildSpecBlockCreates(replacementBlocks) },
            }),
          },
          include: locationGraphqlInclude,
        });
        if (params.seats != null) {
          await this.replaceSeats({
            locationId: params.id,
            seatLayoutMode: updated.seatLayoutMode,
            seats: params.seats,
          });
          return this.getById({ userId: params.userId, id: params.id });
        }
        return updated;
      });
    }

    const updated = await this.prisma.location.update({
      where: { id: params.id },
      data: scalarData,
      include: locationGraphqlInclude,
    });

    if (params.seats != null) {
      await this.replaceSeats({
        locationId: params.id,
        seatLayoutMode: updated.seatLayoutMode,
        seats: params.seats,
      });
      return this.getById({ userId: params.userId, id: params.id });
    }

    return updated;
  }

  async delete(params: { userId: string; id: string }) {
    await this.getByIdBare({ userId: params.userId, id: params.id });
    await this.prisma.location.delete({ where: { id: params.id } });
    return true;
  }
}
