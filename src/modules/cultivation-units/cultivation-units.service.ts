import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CultivationUnitPlacementRole,
  LocationSubType,
  LocationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ProductsService } from "../reference-data/products.service";
import {
  assertTypeSubTypeMatch,
  buildCultivationUnitSpecBlockCreates,
  type SpecBlockInput,
  validateSpecBlocks,
} from "./spec-blocks.util";

export type CultivationUnitSpecBlockInput = SpecBlockInput;

export const cultivationUnitGraphqlInclude = {
  primaryLocation: true,
  plants: { orderBy: { createdAt: "desc" as const } },
  diaries: { orderBy: { createdAt: "desc" as const } },
  placements: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: { location: true },
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
} satisfies Prisma.CultivationUnitInclude;

@Injectable()
export class CultivationUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  private async assertLocationOwned(userId: string, locationId: string) {
    const row = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!row) {
      throw new BadRequestException("locationId: location not found");
    }
    if (row.userId !== userId) {
      throw new ForbiddenException();
    }
    return row;
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

  private async validateSpecBlocksForCreate(blocks: CultivationUnitSpecBlockInput[] | undefined) {
    if (!blocks?.length) return;
    for (const b of blocks) {
      if (b.enclosure?.productId) {
        await this.assertProductExists(b.enclosure.productId);
      }
    }
  }

  async list(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.cultivationUnit.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
      include: cultivationUnitGraphqlInclude,
    });
  }

  async getById(params: { userId: string; id: string }) {
    const row = await this.prisma.cultivationUnit.findUnique({
      where: { id: params.id },
      include: cultivationUnitGraphqlInclude,
    });
    if (!row) {
      throw new NotFoundException("CultivationUnit not found");
    }
    if (row.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return row;
  }

  async getByIdBare(params: { userId: string; id: string }) {
    const row = await this.prisma.cultivationUnit.findUnique({ where: { id: params.id } });
    if (!row) {
      throw new NotFoundException("CultivationUnit not found");
    }
    if (row.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return row;
  }

  async create(params: {
    userId: string;
    name: string;
    primaryLocationId?: string | null;
    status?: "active" | "archived" | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: CultivationUnitSpecBlockInput[] | null;
    additionalLocationIds?: string[] | null;
  }) {
    assertTypeSubTypeMatch(params.type ?? undefined, params.subType ?? undefined);

    const primaryLocationId = params.primaryLocationId?.trim() || null;
    if (primaryLocationId) {
      await this.assertLocationOwned(params.userId, primaryLocationId);
    }

    const blocks = params.specBlocks ?? undefined;
    validateSpecBlocks(blocks);
    await this.validateSpecBlocksForCreate(blocks);

    const diaryIds = params.diaryIds ?? [];
    await this.assertDiariesOwnedByUser(params.userId, diaryIds);

    const additionalIds = params.additionalLocationIds ?? [];
    for (const locationId of additionalIds) {
      if (primaryLocationId && locationId === primaryLocationId) continue;
      await this.assertLocationOwned(params.userId, locationId);
    }

    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.cultivationUnit.create({
        data: {
          userId: params.userId,
          name: params.name,
          ...(primaryLocationId && { primaryLocationId }),
          ...(params.status != null && { status: params.status }),
          ...(params.type !== undefined && { type: params.type }),
          ...(params.subType !== undefined && { subType: params.subType }),
          ...(params.capacity !== undefined && { capacity: params.capacity }),
          ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
          ...(diaryIds.length > 0 && {
            diaries: { connect: diaryIds.map((id) => ({ id })) },
          }),
          ...(blocks?.length && {
            specBlocks: { create: buildCultivationUnitSpecBlockCreates(blocks) },
          }),
          ...(primaryLocationId && {
            placements: {
              create: {
                locationId: primaryLocationId,
                role: CultivationUnitPlacementRole.primary,
                sortOrder: 0,
              },
            },
          }),
        },
        include: cultivationUnitGraphqlInclude,
      });

      for (const [index, locationId] of additionalIds.entries()) {
        if (primaryLocationId && locationId === primaryLocationId) continue;
        await tx.cultivationUnitPlacement.create({
          data: {
            locationId,
            cultivationUnitId: unit.id,
            role: CultivationUnitPlacementRole.member,
            sortOrder: index + 1,
          },
        });
      }

      if (additionalIds.some((id) => !primaryLocationId || id !== primaryLocationId)) {
        return tx.cultivationUnit.findUniqueOrThrow({
          where: { id: unit.id },
          include: cultivationUnitGraphqlInclude,
        });
      }

      return unit;
    });
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    status?: "active" | "archived" | null;
    type?: LocationType | null;
    subType?: LocationSubType | null;
    capacity?: number | null;
    occupiedSlots?: number | null;
    diaryIds?: string[] | null;
    specBlocks?: CultivationUnitSpecBlockInput[] | null;
    current?: Prisma.InputJsonValue | null;
  }) {
    const existing = await this.getByIdBare({ userId: params.userId, id: params.id });

    const nextType = params.type !== undefined ? params.type : existing.type;
    const nextSubType = params.subType !== undefined ? params.subType : existing.subType;
    assertTypeSubTypeMatch(nextType ?? undefined, nextSubType ?? undefined);

    if (params.diaryIds != null) {
      await this.assertDiariesOwnedByUser(params.userId, params.diaryIds);
    }

    if (params.specBlocks != null) {
      validateSpecBlocks(params.specBlocks);
      for (const b of params.specBlocks) {
        if (b.enclosure?.productId) {
          await this.assertProductExists(b.enclosure.productId);
        }
      }
    }

    const scalarData: Prisma.CultivationUnitUpdateInput = {
      ...(params.name !== undefined && { name: params.name ?? undefined }),
      ...(params.status !== undefined && { status: params.status ?? undefined }),
      ...(params.type !== undefined && { type: params.type }),
      ...(params.subType !== undefined && { subType: params.subType }),
      ...(params.capacity !== undefined && { capacity: params.capacity }),
      ...(params.occupiedSlots !== undefined && { occupiedSlots: params.occupiedSlots }),
      ...(params.current !== undefined && { current: params.current ?? Prisma.JsonNull }),
      ...(params.diaryIds != null && {
        diaries: { set: params.diaryIds.map((id) => ({ id })) },
      }),
    };

    if (params.specBlocks != null) {
      const replacementBlocks = params.specBlocks;
      return this.prisma.$transaction(async (tx) => {
        await tx.cultivationUnitSpecBlock.deleteMany({ where: { cultivationUnitId: params.id } });
        return tx.cultivationUnit.update({
          where: { id: params.id },
          data: {
            ...scalarData,
            ...(replacementBlocks.length > 0 && {
              specBlocks: { create: buildCultivationUnitSpecBlockCreates(replacementBlocks) },
            }),
          },
          include: cultivationUnitGraphqlInclude,
        });
      });
    }

    return this.prisma.cultivationUnit.update({
      where: { id: params.id },
      data: scalarData,
      include: cultivationUnitGraphqlInclude,
    });
  }

  async createEvent(params: {
    userId: string;
    cultivationUnitId: string;
    actionPath: string;
    payloadJson: string;
  }) {
    await this.getByIdBare({ userId: params.userId, id: params.cultivationUnitId });

    let payload: Prisma.InputJsonValue;
    try {
      payload = JSON.parse(params.payloadJson) as Prisma.InputJsonValue;
    } catch {
      throw new BadRequestException("payloadJson: invalid JSON");
    }

    await this.prisma.event.create({
      data: {
        actionPath: params.actionPath.trim(),
        targetType: "CultivationUnit",
        targetId: params.cultivationUnitId,
        payload,
      },
    });

    return this.getById({ userId: params.userId, id: params.cultivationUnitId });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getByIdBare({ userId: params.userId, id: params.id });
    await this.prisma.cultivationUnit.delete({ where: { id: params.id } });
    return true;
  }

  async addPlacement(params: {
    userId: string;
    cultivationUnitId: string;
    locationId: string;
    role?: CultivationUnitPlacementRole;
    sortOrder?: number;
  }) {
    await this.getByIdBare({ userId: params.userId, id: params.cultivationUnitId });
    await this.assertLocationOwned(params.userId, params.locationId);

    const role = params.role ?? CultivationUnitPlacementRole.member;
    if (role === CultivationUnitPlacementRole.primary) {
      throw new BadRequestException(
        "Use setCultivationUnitPrimaryLocation to change primary placement",
      );
    }

    return this.prisma.cultivationUnitPlacement.create({
      data: {
        cultivationUnitId: params.cultivationUnitId,
        locationId: params.locationId,
        role,
        sortOrder: params.sortOrder ?? 0,
      },
      include: {
        location: true,
        cultivationUnit: { include: cultivationUnitGraphqlInclude },
      },
    });
  }

  async removePlacement(params: {
    userId: string;
    cultivationUnitId: string;
    locationId: string;
  }) {
    const unit = await this.getByIdBare({ userId: params.userId, id: params.cultivationUnitId });
    const placement = await this.prisma.cultivationUnitPlacement.findUnique({
      where: {
        locationId_cultivationUnitId: {
          locationId: params.locationId,
          cultivationUnitId: params.cultivationUnitId,
        },
      },
    });
    if (!placement) {
      throw new NotFoundException("Placement not found");
    }
    if (placement.role === CultivationUnitPlacementRole.primary) {
      throw new BadRequestException("Cannot remove primary placement; set a new primary first");
    }
    if (unit.primaryLocationId === params.locationId) {
      throw new BadRequestException("Cannot remove placement for current primaryLocationId");
    }

    await this.prisma.cultivationUnitPlacement.delete({
      where: { id: placement.id },
    });
    return true;
  }

  async setPrimaryLocation(params: {
    userId: string;
    cultivationUnitId: string;
    locationId: string;
  }) {
    await this.getByIdBare({ userId: params.userId, id: params.cultivationUnitId });
    await this.assertLocationOwned(params.userId, params.locationId);

    return this.prisma.$transaction(async (tx) => {
      const existingPrimary = await tx.cultivationUnitPlacement.findFirst({
        where: {
          cultivationUnitId: params.cultivationUnitId,
          role: CultivationUnitPlacementRole.primary,
        },
      });

      if (existingPrimary && existingPrimary.locationId !== params.locationId) {
        await tx.cultivationUnitPlacement.update({
          where: { id: existingPrimary.id },
          data: { role: CultivationUnitPlacementRole.member },
        });
      }

      await tx.cultivationUnitPlacement.upsert({
        where: {
          locationId_cultivationUnitId: {
            locationId: params.locationId,
            cultivationUnitId: params.cultivationUnitId,
          },
        },
        create: {
          locationId: params.locationId,
          cultivationUnitId: params.cultivationUnitId,
          role: CultivationUnitPlacementRole.primary,
          sortOrder: 0,
        },
        update: { role: CultivationUnitPlacementRole.primary },
      });

      return tx.cultivationUnit.update({
        where: { id: params.cultivationUnitId },
        data: { primaryLocationId: params.locationId },
        include: cultivationUnitGraphqlInclude,
      });
    });
  }
}
