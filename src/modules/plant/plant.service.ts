import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
    const plant = await this.prisma.plant.findUnique({ where: { id: params.id } });
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

  async update(params: { userId: string; id: string; name?: string | null }) {
    await this.getById({ userId: params.userId, id: params.id });

    return this.prisma.plant.update({
      where: { id: params.id },
      data: {
        name: params.name ?? undefined,
      },
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getById({ userId: params.userId, id: params.id });

    await this.prisma.plant.delete({ where: { id: params.id } });
    return true;
  }
}
