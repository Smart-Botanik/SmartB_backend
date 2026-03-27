import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class DiaryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.diary.findMany({
      where: { userId: params.userId },
      include: { plant: true },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
    });
  }

  async getById(params: { userId: string; id: string }) {
    const diary = await this.prisma.diary.findUnique({
      where: { id: params.id },
      include: { plant: true },
    });

    if (!diary) {
      throw new NotFoundException("Diary not found");
    }
    if (diary.userId !== params.userId) {
      throw new ForbiddenException();
    }

    return diary;
  }

  private async assertPlantOwnership(params: { userId: string; plantId: string }) {
    const plant = await this.prisma.plant.findUnique({ where: { id: params.plantId } });
    if (!plant) {
      throw new NotFoundException("Plant not found");
    }
    if (plant.userId !== params.userId) {
      throw new ForbiddenException();
    }
  }

  async create(params: {
    userId: string;
    plantId: string;
    title?: string | null;
    body: string;
  }) {
    await this.assertPlantOwnership({ userId: params.userId, plantId: params.plantId });

    return this.prisma.diary.create({
      data: {
        userId: params.userId,
        plantId: params.plantId,
        title: params.title ?? null,
        body: params.body,
      },
      include: { plant: true },
    });
  }

  async update(params: {
    userId: string;
    id: string;
    title?: string | null;
    body?: string | null;
  }) {
    await this.getById({ userId: params.userId, id: params.id });

    return this.prisma.diary.update({
      where: { id: params.id },
      data: {
        title: params.title ?? undefined,
        body: params.body ?? undefined,
      },
      include: { plant: true },
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getById({ userId: params.userId, id: params.id });

    await this.prisma.diary.delete({ where: { id: params.id } });
    return true;
  }
}
