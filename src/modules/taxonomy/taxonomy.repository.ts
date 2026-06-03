import { Injectable } from "@nestjs/common";
import {
  Prisma,
  TaxonomyTagStatus,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const tagWithParentChildren = {
  parent: true,
  children: { orderBy: [{ sortOrder: "asc" as const }, { label: "asc" as const }] },
};

/**
 * Единственная точка Prisma-доступа к TaxonomyScope / TaxonomyTag (BK-MS-TAX-1).
 */
@Injectable()
export class TaxonomyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyScopes() {
    return this.prisma.taxonomyScope.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
  }

  findScopeByKey(key: string) {
    return this.prisma.taxonomyScope.findUnique({ where: { key } });
  }

  createScope(data: {
    key: string;
    label: string;
    description?: string;
    sortOrder: number;
  }) {
    return this.prisma.taxonomyScope.create({ data });
  }

  findForestRoots(scopeKey: string, status?: TaxonomyTagStatus) {
    return this.prisma.taxonomyTag.findMany({
      where: {
        scopeKey,
        parentId: null,
        ...(status ? { status } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: {
        children: {
          where: status ? { status } : undefined,
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          include: {
            children: {
              where: status ? { status } : undefined,
              orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
            },
          },
        },
      },
    });
  }

  async listPage(params: {
    where: Prisma.TaxonomyTagWhereInput;
    limit?: number;
    offset?: number;
  }) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.taxonomyTag.count({ where: params.where }),
      this.prisma.taxonomyTag.findMany({
        where: params.where,
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        take: params.limit ?? undefined,
        skip: params.offset ?? undefined,
        include: tagWithParentChildren,
      }),
    ]);
    return { total, items };
  }

  findTagById(id: string) {
    return this.prisma.taxonomyTag.findUnique({
      where: { id },
      include: tagWithParentChildren,
    });
  }

  findTagsByIds(ids: string[]) {
    return this.prisma.taxonomyTag.findMany({
      where: { id: { in: ids } },
    });
  }

  findTagsByKeys(keys: string[]) {
    return this.prisma.taxonomyTag.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
  }

  findTagScopeKey(id: string) {
    return this.prisma.taxonomyTag.findUnique({
      where: { id },
      select: { scopeKey: true },
    });
  }

  findTagForParentCheck(id: string) {
    return this.prisma.taxonomyTag.findUnique({ where: { id } });
  }

  createTag(data: Prisma.TaxonomyTagUncheckedCreateInput) {
    return this.prisma.taxonomyTag.create({
      data,
      include: tagWithParentChildren,
    });
  }

  updateTag(id: string, data: Prisma.TaxonomyTagUncheckedUpdateInput) {
    return this.prisma.taxonomyTag.update({
      where: { id },
      data,
      include: tagWithParentChildren,
    });
  }

  deleteTag(id: string) {
    return this.prisma.taxonomyTag.delete({ where: { id } });
  }

  updateChildrenParent(fromParentId: string, toParentId: string | null) {
    return this.prisma.taxonomyTag.updateMany({
      where: { parentId: fromParentId },
      data: { parentId: toParentId },
    });
  }

  findChildIds(parentId: string) {
    return this.prisma.taxonomyTag.findMany({
      where: { parentId },
      select: { id: true },
    });
  }
}
