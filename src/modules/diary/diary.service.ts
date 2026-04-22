import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { locationGraphqlInclude } from "../locations/locations.service";

@Injectable()
export class DiaryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { userId: string; limit?: number; offset?: number }) {
    return this.prisma.diary.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? undefined,
      skip: params.offset ?? undefined,
    });
  }

  async getById(params: { userId: string; id: string }) {
    const diary = await this.prisma.diary.findUnique({
      where: { id: params.id },
    });

    if (!diary) {
      throw new NotFoundException("Diary not found");
    }
    if (diary.userId !== params.userId) {
      throw new ForbiddenException();
    }

    return diary;
  }

  async listLocationsForDiary(params: { userId: string; diaryId: string }) {
    await this.getById({ userId: params.userId, id: params.diaryId });

    return this.prisma.location.findMany({
      where: {
        userId: params.userId,
        diaries: { some: { id: params.diaryId } },
      },
      orderBy: { createdAt: "desc" },
      include: locationGraphqlInclude,
    });
  }

  async listPlants(params: { userId: string; diaryId: string }) {
    await this.getById({ userId: params.userId, id: params.diaryId });

    return this.prisma.plant.findMany({
      // NOTE: `diaryId` exists in Prisma schema, but TS types may be stale until `prisma generate` is run.
      where: {
        userId: params.userId,
        diaryId: params.diaryId,
      } as any,
      orderBy: { createdAt: "desc" },
    });
  }

  async listPlantGroups(params: { userId: string; diaryId: string }) {
    await this.getById({ userId: params.userId, id: params.diaryId });

    return this.prisma.plantGroup.findMany({
      where: {
        userId: params.userId,
        diaryId: params.diaryId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(params: {
    userId: string;
    title?: string | null;
    body: string;
  }) {
    return this.prisma.diary.create({
      data: {
        userId: params.userId,
        title: params.title ?? null,
        body: params.body,
      },
    });
  }

  async update(params: {
    userId: string;
    id: string;
    title?: string | null;
    body?: string | null;
  }) {
    await this.getById({ userId: params.userId, id: params.id });

    const data: { title?: string | null; body?: string } = {};
    if (params.title !== undefined) {
      data.title = params.title;
    }
    if (params.body !== undefined && params.body !== null) {
      data.body = params.body;
    }

    return this.prisma.diary.update({
      where: { id: params.id },
      data,
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getById({ userId: params.userId, id: params.id });

    await this.prisma.diary.delete({ where: { id: params.id } });
    return true;
  }
}
