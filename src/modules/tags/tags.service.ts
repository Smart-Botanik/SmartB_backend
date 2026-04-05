import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: string | null;
    targetType?: string | null;
  }) {
    const where = {
      ...(params.query
        ? { label: { contains: params.query, mode: "insensitive" as const } }
        : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.targetType ? { targetType: params.targetType } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.tag.count({ where }),
      this.prisma.tag.findMany({
        where,
        orderBy: { label: "asc" },
        take: params.limit ?? undefined,
        skip: params.offset ?? undefined,
      }),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException("Tag not found");
    }
    return tag;
  }

  async create(params: {
    label: string;
    targetType?: string | null;
    color?: string | null;
    icon?: string | null;
    category?: string | null;
  }) {
    return this.prisma.tag.create({
      data: {
        label: params.label,
        targetType: params.targetType ?? undefined,
        color: params.color ?? undefined,
        icon: params.icon ?? undefined,
        category: params.category ?? undefined,
      },
    });
  }

  async update(params: {
    id: string;
    label?: string | null;
    targetType?: string | null;
    color?: string | null;
    icon?: string | null;
    category?: string | null;
  }) {
    await this.getById(params.id);

    return this.prisma.tag.update({
      where: { id: params.id },
      data: {
        label: params.label ?? undefined,
        targetType:
          params.targetType === null ? null : (params.targetType ?? undefined),
        color: params.color === null ? null : (params.color ?? undefined),
        icon: params.icon === null ? null : (params.icon ?? undefined),
        category:
          params.category === null ? null : (params.category ?? undefined),
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.prisma.tag.delete({ where: { id } });
    return true;
  }
}
