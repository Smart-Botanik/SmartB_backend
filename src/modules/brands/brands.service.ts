import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { BrandCategory } from "@prisma/client";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  parseCategoryInput(category: string): BrandCategory {
    const key = category.trim().toUpperCase().replace(/-/g, "_");
    const byName = category.trim().toLowerCase();
    const map: Record<string, BrandCategory> = {
      BREADER: BrandCategory.BREADER,
      TENT: BrandCategory.TENT,
      LAMP: BrandCategory.LAMP,
      COMMON: BrandCategory.COMMON,
      breader: BrandCategory.BREADER,
      tent: BrandCategory.TENT,
      lamp: BrandCategory.LAMP,
      common: BrandCategory.COMMON,
    };
    const resolved = map[key] ?? map[byName];
    if (!resolved) {
      throw new BadRequestException(`Invalid brand category: ${category}`);
    }
    return resolved;
  }

  private async assertAvatarMediaId(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media) {
      throw new BadRequestException("avatarMediaId: media not found");
    }
  }

  async list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: BrandCategory | null;
  }) {
    const where = {
      ...(params.query
        ? { name: { contains: params.query, mode: "insensitive" as const } }
        : {}),
      ...(params.category ? { category: params.category } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
        where,
        orderBy: { name: "asc" },
        take: params.limit ?? undefined,
        skip: params.offset ?? undefined,
        include: { avatar: true },
      }),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { avatar: true },
    });
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return brand;
  }

  async create(params: {
    name: string;
    category: BrandCategory | string;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    const category =
      typeof params.category === "string"
        ? this.parseCategoryInput(params.category)
        : params.category;
    if (params.avatarMediaId) {
      await this.assertAvatarMediaId(params.avatarMediaId);
    }
    return this.prisma.brand.create({
      data: {
        name: params.name,
        category,
        description: params.description ?? undefined,
        ...(params.avatarMediaId && { avatarMediaId: params.avatarMediaId }),
      },
      include: { avatar: true },
    });
  }

  async update(params: {
    id: string;
    name?: string | null;
    category?: BrandCategory | string | null;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    await this.getById(params.id);

    let category: BrandCategory | undefined;
    if (params.category !== undefined && params.category !== null) {
      category =
        typeof params.category === "string"
          ? this.parseCategoryInput(params.category)
          : params.category;
    }

    if (params.avatarMediaId) {
      await this.assertAvatarMediaId(params.avatarMediaId);
    }

    return this.prisma.brand.update({
      where: { id: params.id },
      data: {
        name: params.name ?? undefined,
        ...(category !== undefined ? { category } : {}),
        description: params.description ?? undefined,
        avatarMediaId:
          params.avatarMediaId === null
            ? null
            : (params.avatarMediaId ?? undefined),
      },
      include: { avatar: true },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.prisma.brand.delete({ where: { id } });
    return true;
  }
}
