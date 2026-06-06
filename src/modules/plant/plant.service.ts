import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PlantGroupStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const MAX_PLANTS_PER_CREATE_PLANTS = 500;

@Injectable()
export class PlantService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnedDiary(userId: string, diaryId: string) {
    const diary = await this.prisma.diary.findUnique({ where: { id: diaryId } });
    if (!diary) {
      throw new NotFoundException("Diary not found");
    }
    if (diary.userId !== userId) {
      throw new ForbiddenException();
    }
    return diary;
  }

  private async assertOwnedGroup(userId: string, groupId: string) {
    const group = await this.prisma.plantGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException("Plant group not found");
    }
    if (group.userId !== userId) {
      throw new ForbiddenException();
    }
    return group;
  }

  private async assertOwnedCultivationUnit(userId: string, cultivationUnitId: string) {
    const unit = await this.prisma.cultivationUnit.findUnique({
      where: { id: cultivationUnitId },
    });
    if (!unit) {
      throw new NotFoundException("CultivationUnit not found");
    }
    if (unit.userId !== userId) {
      throw new ForbiddenException();
    }
    return unit;
  }

  private async assertOwnedLocation(userId: string, locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException("Location not found");
    }
    if (location.userId !== userId) {
      throw new ForbiddenException();
    }
    return location;
  }

  async list(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.plant.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
    });
  }

  async getById(params: { userId: string; id: string }) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: params.id },
    });
    if (!plant) {
      throw new NotFoundException("Plant not found");
    }
    if (plant.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return plant;
  }

  async create(params: { userId: string; name: string }) {
    return this.prisma.plant.create({
      data: {
        userId: params.userId,
        name: params.name,
      },
    });
  }

  async createWithRelations(params: {
    userId: string;
    name: string;
    diaryId?: string | null;
    locationId?: string | null;
    cultivationUnitId?: string | null;
    groupId?: string | null;
  }) {
    if (params.diaryId) {
      await this.assertOwnedDiary(params.userId, params.diaryId);
    }
    if (params.groupId) {
      await this.assertOwnedGroup(params.userId, params.groupId);
    }
    if (params.locationId) {
      await this.assertOwnedLocation(params.userId, params.locationId);
    }
    if (params.cultivationUnitId) {
      await this.assertOwnedCultivationUnit(params.userId, params.cultivationUnitId);
    }
    return this.prisma.plant.create({
      data: {
        userId: params.userId,
        name: params.name,
        diaryId: params.diaryId ?? null,
        locationId: params.locationId ?? null,
        cultivationUnitId: params.cultivationUnitId ?? null,
        groupId: params.groupId ?? null,
      },
    });
  }

  /**
   * Creates `count` separate Plant rows with the same name and optional relations.
   */
  async createPlants(params: {
    userId: string;
    name: string;
    count: number;
    diaryId?: string | null;
    locationId?: string | null;
    groupId?: string | null;
  }) {
    const count = params.count;
    if (!Number.isInteger(count) || count < 1) {
      throw new BadRequestException("count must be a positive integer");
    }
    if (count > MAX_PLANTS_PER_CREATE_PLANTS) {
      throw new BadRequestException(`count cannot exceed ${MAX_PLANTS_PER_CREATE_PLANTS}`);
    }

    if (params.diaryId) {
      await this.assertOwnedDiary(params.userId, params.diaryId);
    }
    if (params.groupId) {
      await this.assertOwnedGroup(params.userId, params.groupId);
    }

    const name = params.name.trim();
    if (name.length === 0) {
      throw new BadRequestException("name is required");
    }

    const data = {
      userId: params.userId,
      name,
      diaryId: params.diaryId ?? null,
      locationId: params.locationId ?? null,
      groupId: params.groupId ?? null,
    };

    const creates = Array.from({ length: count }, () => this.prisma.plant.create({ data }));

    return this.prisma.$transaction(creates);
  }

  async listGroups(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.plantGroup.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
    });
  }

  async getGroupById(params: { userId: string; id: string }) {
    const group = await this.prisma.plantGroup.findUnique({
      where: { id: params.id },
    });
    if (!group) {
      throw new NotFoundException("Plant group not found");
    }
    if (group.userId !== params.userId) {
      throw new ForbiddenException();
    }
    return group;
  }

  async createGroup(params: {
    userId: string;
    name: string;
    diaryId?: string | null;
    count?: number | null;
  }) {
    const count = params.count ?? null;
    if (count != null) {
      if (!Number.isInteger(count) || count < 1) {
        throw new BadRequestException("count must be a positive integer");
      }
      if (count > MAX_PLANTS_PER_CREATE_PLANTS) {
        throw new BadRequestException(`count cannot exceed ${MAX_PLANTS_PER_CREATE_PLANTS}`);
      }
    }
    if (params.diaryId) {
      await this.assertOwnedDiary(params.userId, params.diaryId);
    }
    const name = params.name.trim();
    if (name.length === 0) {
      throw new BadRequestException("Group name cannot be empty");
    }

    return this.prisma.$transaction(async tx => {
      const createdGroup = await tx.plantGroup.create({
        data: {
          userId: params.userId,
          name,
          diaryId: params.diaryId ?? null,
          status: PlantGroupStatus.active,
        },
      });
      if (count && count > 0) {
        await tx.plant.createMany({
          data: Array.from({ length: count }, () => ({
            userId: params.userId,
            name,
            diaryId: params.diaryId ?? null,
            groupId: createdGroup.id,
          })),
        });
      }
      return createdGroup;
    });
  }

  async updateGroup(params: {
    userId: string;
    id: string;
    name?: string;
    diaryId?: string | null;
    status?: PlantGroupStatus;
  }) {
    await this.getGroupById({ userId: params.userId, id: params.id });

    const data: { name?: string; diaryId?: string | null; status?: PlantGroupStatus } = {};

    if (params.name !== undefined) {
      const trimmed = params.name.trim();
      if (trimmed.length < 1) {
        throw new BadRequestException("Group name cannot be empty");
      }
      data.name = trimmed;
    }

    if (params.diaryId !== undefined) {
      if (params.diaryId) {
        await this.assertOwnedDiary(params.userId, params.diaryId);
      }
      data.diaryId = params.diaryId;
    }

    if (params.status !== undefined) {
      data.status = params.status;
    }

    if (Object.keys(data).length === 0) {
      return this.getGroupById({ userId: params.userId, id: params.id });
    }

    return this.prisma.plantGroup.update({
      where: { id: params.id },
      data,
    });
  }

  async listPlantsForGroup(params: { userId: string; groupId: string }) {
    await this.getGroupById({ userId: params.userId, id: params.groupId });
    return this.prisma.plant.findMany({
      where: {
        userId: params.userId,
        groupId: params.groupId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    diaryId?: string | null;
    locationId?: string | null;
    cultivationUnitId?: string | null;
    cultivationUnitNudgeDismissed?: boolean | null;
  }) {
    await this.getById({ userId: params.userId, id: params.id });

    const data: {
      name?: string;
      diaryId?: string | null;
      locationId?: string | null;
      cultivationUnitId?: string | null;
      cultivationUnitNudgeDismissed?: boolean;
    } = {};

    if (params.name !== undefined) {
      data.name = params.name ?? undefined;
    }

    if (params.diaryId !== undefined) {
      if (params.diaryId === null) {
        data.diaryId = null;
      } else {
        await this.assertOwnedDiary(params.userId, params.diaryId);
        data.diaryId = params.diaryId;
      }
    }

    if (params.locationId !== undefined) {
      if (params.locationId === null) {
        data.locationId = null;
      } else {
        await this.assertOwnedLocation(params.userId, params.locationId);
        data.locationId = params.locationId;
      }
    }

    if (params.cultivationUnitId !== undefined) {
      if (params.cultivationUnitId === null) {
        data.cultivationUnitId = null;
      } else {
        await this.assertOwnedCultivationUnit(params.userId, params.cultivationUnitId);
        data.cultivationUnitId = params.cultivationUnitId;
      }
    }

    if (params.cultivationUnitNudgeDismissed !== undefined && params.cultivationUnitNudgeDismissed !== null) {
      data.cultivationUnitNudgeDismissed = params.cultivationUnitNudgeDismissed;
    }

    if (Object.keys(data).length === 0) {
      return this.prisma.plant.findUniqueOrThrow({ where: { id: params.id } });
    }

    return this.prisma.plant.update({
      where: { id: params.id },
      data,
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getById({ userId: params.userId, id: params.id });

    await this.prisma.plant.delete({ where: { id: params.id } });
    return true;
  }
}
