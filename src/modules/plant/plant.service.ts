import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class PlantService {
  constructor(private readonly prisma: PrismaService) {}

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

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    diaryId?: string | null;
  }) {
    await this.getById({ userId: params.userId, id: params.id });

    const data: { name?: string; diaryId?: string | null } = {};

    if (params.name !== undefined) {
      data.name = params.name ?? undefined;
    }

    if (params.diaryId !== undefined) {
      if (params.diaryId === null) {
        data.diaryId = null;
      } else {
        const diary = await this.prisma.diary.findUnique({
          where: { id: params.diaryId },
        });
        if (!diary) {
          throw new NotFoundException("Diary not found");
        }
        if (diary.userId !== params.userId) {
          throw new ForbiddenException();
        }
        data.diaryId = params.diaryId;
      }
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
