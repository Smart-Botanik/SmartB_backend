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
import { LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ProductsService } from "../reference-data/products.service";
import { TaxonomyConsumerCatalogService } from "../taxonomy/taxonomy-consumer-catalog.service";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { resolveEnvironmentFieldsFromTag } from "./location-environment.util";
import {
  buildLayoutMetaForCapacity,
  buildSeatCreateInputs,
  generateFixedGridSeatInputs,
  type CreateSeatInput,
} from "./seat.util";

/** GraphQL / Prisma — вложенные блоки specs + связи для ответа */
export const locationGraphqlInclude = {
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

  private async resolveEnvironmentTagFromLegacySubType(
    subType: LocationSubType,
  ): Promise<FlatTaxonomyTag> {
    const variantKey = LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY[subType];
    if (!variantKey) {
      throw new BadRequestException(`subType: cannot map to environment tag (${subType})`);
    }
    const tags = (await this.taxonomyTagService.tagsByKeys([variantKey])) as FlatTaxonomyTag[];
    const tag = tags[0];
    if (!tag?.id) {
      throw new BadRequestException(`subType: taxonomy tag not found (${variantKey})`);
    }
    return this.assertEnvironmentVariantTagId(tag.id);
  }

  private async resolveEnvironmentInput(params: {
    environmentTagId?: string | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
  }): Promise<{ environmentTagId: string; environmentGroupSlug: string | null }> {
    const tagId = params.environmentTagId?.trim() || null;
    if (tagId) {
      const tag = await this.assertEnvironmentVariantTagId(tagId);
      const resolved = resolveEnvironmentFieldsFromTag(tag);
      return {
        environmentTagId: resolved.environmentTagId,
        environmentGroupSlug: resolved.environmentGroupSlug,
      };
    }
    if (params.subType) {
      assertTypeSubTypeMatch(params.type ?? undefined, params.subType);
      const tag = await this.resolveEnvironmentTagFromLegacySubType(params.subType);
      const resolved = resolveEnvironmentFieldsFromTag(tag);
      return {
        environmentTagId: resolved.environmentTagId,
        environmentGroupSlug: resolved.environmentGroupSlug,
      };
    }
    throw new BadRequestException("environmentTagId or subType is required");
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
    status?: "active" | "archived" | null;
    environmentTagId?: string | null;
    dimensions?: Prisma.InputJsonValue | null;
    seatLayoutMode?: SeatLayoutMode | null;
    layoutMeta?: Prisma.InputJsonValue | null;
    taxonomyTagIds?: string[] | null;
    /** Legacy input bridge — resolved to environmentTagId (BK-REW-01-3). */
    type?: LocationType | null;
    subType?: LocationSubType | null;
    wateringType?: "manual" | "drip" | "hydroponics" | "aeroponics" | null;
    description?: string | null;
    /** Legacy input bridge — seeds fixed_grid when seats omitted. */
    capacity?: number | null;
    /** Legacy input bridge — maps to occupiedCount on create. */
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

    let seatLayoutMode = params.seatLayoutMode ?? SeatLayoutMode.simple_counter;
    let layoutMeta = params.layoutMeta;
    let seats = params.seats ?? [];

    if (
      seats.length === 0 &&
      params.capacity != null &&
      params.capacity >= 1 &&
      seatLayoutMode === "fixed_grid"
    ) {
      seats = generateFixedGridSeatInputs(params.capacity);
      if (layoutMeta == null) {
        layoutMeta = buildLayoutMetaForCapacity(params.capacity) as Prisma.InputJsonValue;
      }
    }

    const created = await this.prisma.location.create({
      data: {
        userId: params.userId,
        name: params.name,
        ...(params.status != null && { status: params.status }),
        environmentTagId: env.environmentTagId,
        environmentGroupSlug: env.environmentGroupSlug,
        ...(params.dimensions !== undefined && {
          dimensions:
            params.dimensions === null
              ? Prisma.JsonNull
              : (params.dimensions as Prisma.InputJsonValue),
        }),
        seatLayoutMode,
        ...(layoutMeta !== undefined && {
          layoutMeta:
            layoutMeta === null ? Prisma.JsonNull : (layoutMeta as Prisma.InputJsonValue),
        }),
        ...(params.wateringType !== undefined && { wateringType: params.wateringType }),
        ...(params.description !== undefined && { description: params.description }),
        occupiedCount: Math.max(0, params.occupiedSlots ?? 0),
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
                : params.subType !== undefined || params.type !== undefined
                  ? null
                  : existing.environmentTagId,
            type: params.type,
            subType: params.subType,
          })
        : null;

    if (params.taxonomyTagIds != null) {
      await this.assertFeatureTaxonomyTagIds(params.taxonomyTagIds);
    }

    if (params.diaryIds != null) {
      await this.assertDiariesOwnedByUser(params.userId, params.diaryIds);
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
      ...(params.status !== undefined && { status: params.status ?? undefined }),
      ...(env != null && {
        environmentTagId: env.environmentTagId,
        environmentGroupSlug: env.environmentGroupSlug,
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
      ...(params.occupiedSlots !== undefined && {
        occupiedCount: Math.max(0, params.occupiedSlots ?? 0),
      }),
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
