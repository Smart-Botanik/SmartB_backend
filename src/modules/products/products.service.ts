import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const productInclude = {
  avatar: true,
  brand: { include: { avatar: true } },
  taxonomyTags: { orderBy: { sortOrder: "asc" as const } },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyTagService: TaxonomyTagService,
  ) {}

  private async assertBrandExists(brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw new BadRequestException("brandId: brand not found");
    }
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
    category?: string | null;
    brandId?: string | null;
  }) {
    const where = {
      ...(params.query ? { name: { contains: params.query, mode: "insensitive" as const } } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.brandId ? { brandId: params.brandId } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        take: params.limit ?? undefined,
        skip: params.offset ?? undefined,
        include: productInclude,
      }),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async create(params: {
    name: string;
    category: string;
    brandId: string;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }) {
    await this.assertBrandExists(params.brandId);
    if (params.avatarMediaId) {
      await this.assertAvatarMediaId(params.avatarMediaId);
    }
    const taxonomyTags = await this.taxonomyTagService.connectByIds(params.taxonomyTagIds, {
      requireCropRoot: Boolean(params.taxonomyTagIds?.length),
    });

    return this.prisma.product.create({
      data: {
        name: params.name,
        category: params.category,
        brandId: params.brandId,
        ...(params.avatarMediaId && { avatarMediaId: params.avatarMediaId }),
        ...(taxonomyTags
          ? {
              taxonomyTags: {
                connect: taxonomyTags.set.map(tag => ({ id: tag.id })),
              },
            }
          : {}),
      },
      include: productInclude,
    });
  }

  async update(params: {
    id: string;
    name?: string | null;
    category?: string | null;
    brandId?: string | null;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }) {
    await this.getById(params.id);

    if (params.brandId) {
      await this.assertBrandExists(params.brandId);
    }
    if (params.avatarMediaId) {
      await this.assertAvatarMediaId(params.avatarMediaId);
    }

    const taxonomyTags = await this.taxonomyTagService.connectByIds(params.taxonomyTagIds, {
      requireCropRoot: Boolean(params.taxonomyTagIds?.length),
    });

    return this.prisma.product.update({
      where: { id: params.id },
      data: {
        name: params.name ?? undefined,
        category: params.category ?? undefined,
        brandId: params.brandId ?? undefined,
        avatarMediaId: params.avatarMediaId === null ? null : params.avatarMediaId ?? undefined,
        ...(taxonomyTags ? { taxonomyTags } : {}),
      },
      include: productInclude,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.prisma.product.delete({ where: { id } });
    return true;
  }
}
