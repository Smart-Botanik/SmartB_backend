import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { BrandCategory } from "@prisma/client";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

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
    category: BrandCategory;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    return this.prisma.brand.create({
      data: {
        name: params.name,
        category: params.category,
        description: params.description ?? undefined,
        ...(params.avatarMediaId && { avatarMediaId: params.avatarMediaId }),
      },
      include: { avatar: true },
    });
  }

  async update(params: {
    id: string;
    name?: string | null;
    category?: BrandCategory | null;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    await this.getById(params.id);

    return this.prisma.brand.update({
      where: { id: params.id },
      data: {
        name: params.name ?? undefined,
        category: params.category ?? undefined,
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
