import {

  BadRequestException,

  Injectable,

  NotFoundException,

} from "@nestjs/common";

import {

  ContentStatus,

  CropKind,

  Prisma,

} from "@prisma/client";

import {

  extractMediaRefs,

  resolveMediaRefs,

} from "@growing/content-markdown";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { TaxonomyTagService } from "./taxonomy-tag.service";

const guideInclude = {
  coverMedia: true,
  taxonomyTags: { orderBy: { sortOrder: "asc" as const } },
} as const;

@Injectable()

export class ContentService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyTagService: TaxonomyTagService,
  ) {}



  private parseJsonString(raw: string, fieldName: string): Prisma.InputJsonValue {

    try {

      return JSON.parse(raw) as Prisma.InputJsonValue;

    } catch {

      throw new BadRequestException(`${fieldName}: invalid JSON`);

    }

  }



  private async assertCoverMediaId(mediaId: string) {

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });

    if (!media) {

      throw new BadRequestException("coverMediaId: media not found");

    }

  }



  private async validateMediaRefsInMarkdown(

    ...fields: Array<string | null | undefined>

  ) {

    const ids = [

      ...new Set(fields.flatMap(field => extractMediaRefs(field ?? ""))),

    ];

    if (ids.length === 0) return;



    const found = await this.prisma.media.findMany({

      where: { id: { in: ids } },

      select: { id: true },

    });

    const foundIds = new Set(found.map(item => item.id));

    const missing = ids.filter(id => !foundIds.has(id));

    if (missing.length > 0) {

      throw new BadRequestException(

        `Markdown media refs not found: ${missing.join(", ")}`,

      );

    }

  }



  async resolveMediaInMarkdown(markdown: string): Promise<string> {

    const ids = extractMediaRefs(markdown);

    if (ids.length === 0) return markdown;



    const media = await this.prisma.media.findMany({

      where: { id: { in: ids } },

      select: { id: true, url: true },

    });

    const urlById = Object.fromEntries(media.map(item => [item.id, item.url]));

    return resolveMediaRefs(markdown, urlById);

  }



  private handleUniqueViolation(error: unknown, message: string): never {

    if (

      error instanceof Prisma.PrismaClientKnownRequestError &&

      error.code === "P2002"

    ) {

      throw new BadRequestException(message);

    }

    throw error;

  }



  async listCropGuides(params: {

    limit?: number;

    offset?: number;

    cropKind?: CropKind | null;

    status?: ContentStatus | null;

    query?: string | null;

    termKey?: string | null;

  }) {

    const where: Prisma.CropGuideWhereInput = {

      ...(params.cropKind ? { cropKind: params.cropKind } : {}),

      ...(params.status ? { status: params.status } : {}),

      ...(params.termKey

        ? { taxonomyTags: { some: { key: params.termKey } } }

        : {}),

      ...(params.query

        ? {

            OR: [

              { title: { contains: params.query, mode: "insensitive" } },

              { slug: { contains: params.query, mode: "insensitive" } },

            ],

          }

        : {}),

    };



    const [total, items] = await this.prisma.$transaction([

      this.prisma.cropGuide.count({ where }),

      this.prisma.cropGuide.findMany({

        where,

        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],

        take: params.limit ?? undefined,

        skip: params.offset ?? undefined,

        include: guideInclude,

      }),

    ]);



    return { items, total };

  }



  async getCropGuideById(id: string) {

    const guide = await this.prisma.cropGuide.findUnique({

      where: { id },

      include: guideInclude,

    });

    if (!guide) {

      throw new NotFoundException("CropGuide not found");

    }

    return guide;

  }



  async getCropGuideBySlug(slug: string) {

    const guide = await this.prisma.cropGuide.findUnique({

      where: { slug },

      include: guideInclude,

    });

    if (!guide) {

      throw new NotFoundException("CropGuide not found");

    }

    return guide;

  }



  async listPublishedCropGuides(
    cropKind?: CropKind | null,
    termKey?: string | null,
  ) {

    return this.prisma.cropGuide.findMany({

      where: {

        status: ContentStatus.PUBLISHED,

        ...(cropKind ? { cropKind } : {}),

        ...(termKey ? { taxonomyTags: { some: { key: termKey } } } : {}),

      },

      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],

      include: guideInclude,

    });

  }



  async getPublishedCropGuideBySlug(slug: string) {

    const guide = await this.prisma.cropGuide.findFirst({

      where: { slug, status: ContentStatus.PUBLISHED },

      include: guideInclude,

    });

    if (!guide) {

      throw new NotFoundException("Published crop guide not found");

    }

    return guide;

  }



  async createCropGuide(params: {

    cropKind: CropKind;

    slug: string;

    title: string;

    excerpt?: string | null;

    bodyJson?: string | null;

    bodySiteMd?: string | null;

    bodyTelegramMd?: string | null;

    coverMediaId?: string | null;

    seoTitle?: string | null;

    seoDescription?: string | null;

    sortOrder?: number | null;

    taxonomyTagIds?: string[] | null;

  }) {

    if (params.coverMediaId) {

      await this.assertCoverMediaId(params.coverMediaId);

    }



    await this.validateMediaRefsInMarkdown(

      params.bodySiteMd,

      params.bodyTelegramMd,

    );



    const bodySiteMd = params.bodySiteMd ?? "";

    const bodyTelegramMd = params.bodyTelegramMd ?? "";

    const taxonomyTags = await this.taxonomyTagService.connectByIds(params.taxonomyTagIds, {
      cropKind: params.cropKind,
      requireCropRoot: Boolean(params.taxonomyTagIds?.length),
    });



    if (!params.bodyJson && !bodySiteMd.trim()) {

      throw new BadRequestException("bodySiteMd or bodyJson is required");

    }



    try {

      return await this.prisma.cropGuide.create({

        data: {

          cropKind: params.cropKind,

          slug: params.slug.trim(),

          title: params.title,

          excerpt: params.excerpt ?? undefined,

          body: params.bodyJson

            ? this.parseJsonString(params.bodyJson, "bodyJson")

            : [],

          bodySiteMd,

          bodyTelegramMd,

          ...(params.coverMediaId

            ? { coverMedia: { connect: { id: params.coverMediaId } } }

            : {}),

          seoTitle: params.seoTitle ?? undefined,

          seoDescription: params.seoDescription ?? undefined,

          sortOrder: params.sortOrder ?? undefined,

          ...(taxonomyTags

            ? {

                taxonomyTags: {

                  connect: taxonomyTags.set.map(tag => ({ id: tag.id })),

                },

              }

            : {}),

        },

        include: guideInclude,

      });

    } catch (error) {

      this.handleUniqueViolation(error, "CropGuide slug already exists");

    }

  }



  async updateCropGuide(params: {

    id: string;

    cropKind?: CropKind | null;

    slug?: string | null;

    title?: string | null;

    excerpt?: string | null;

    bodyJson?: string | null;

    bodySiteMd?: string | null;

    bodyTelegramMd?: string | null;

    coverMediaId?: string | null;

    status?: ContentStatus | null;

    seoTitle?: string | null;

    seoDescription?: string | null;

    sortOrder?: number | null;

    taxonomyTagIds?: string[] | null;

  }) {

    const existing = await this.getCropGuideById(params.id);



    if (params.coverMediaId) {

      await this.assertCoverMediaId(params.coverMediaId);

    }



    await this.validateMediaRefsInMarkdown(

      params.bodySiteMd,

      params.bodyTelegramMd,

    );

    const taxonomyTags = await this.taxonomyTagService.connectByIds(params.taxonomyTagIds, {
      cropKind: params.cropKind ?? existing.cropKind,
      requireCropRoot: Boolean(params.taxonomyTagIds?.length),
    });



    try {

      return await this.prisma.cropGuide.update({

        where: { id: params.id },

        data: {

          cropKind: params.cropKind ?? undefined,

          slug: params.slug?.trim() ?? undefined,

          title: params.title ?? undefined,

          excerpt: params.excerpt ?? undefined,

          ...(params.bodyJson != null

            ? { body: this.parseJsonString(params.bodyJson, "bodyJson") }

            : {}),

          ...(params.bodySiteMd != null ? { bodySiteMd: params.bodySiteMd } : {}),

          ...(params.bodyTelegramMd != null

            ? { bodyTelegramMd: params.bodyTelegramMd }

            : {}),

          coverMediaId:

            params.coverMediaId === null

              ? null

              : (params.coverMediaId ?? undefined),

          status: params.status ?? undefined,

          seoTitle: params.seoTitle ?? undefined,

          seoDescription: params.seoDescription ?? undefined,

          sortOrder: params.sortOrder ?? undefined,

          ...(taxonomyTags ? { taxonomyTags } : {}),

        },

        include: guideInclude,

      });

    } catch (error) {

      this.handleUniqueViolation(error, "CropGuide slug already exists");

    }

  }



  async deleteCropGuide(id: string) {

    await this.getCropGuideById(id);

    await this.prisma.cropGuide.delete({ where: { id } });

    return true;

  }



  async publishCropGuide(id: string) {

    await this.getCropGuideById(id);

    return this.prisma.cropGuide.update({

      where: { id },

      data: {

        status: ContentStatus.PUBLISHED,

        publishedAt: new Date(),

      },

      include: guideInclude,

    });

  }



  async unpublishCropGuide(id: string) {

    await this.getCropGuideById(id);

    return this.prisma.cropGuide.update({

      where: { id },

      data: { status: ContentStatus.DRAFT },

      include: guideInclude,

    });

  }



  async listSitePages(status?: ContentStatus | null) {

    return this.prisma.sitePage.findMany({

      where: status ? { status } : undefined,

      orderBy: { key: "asc" },

    });

  }



  async getSitePageByKey(key: string) {

    const page = await this.prisma.sitePage.findUnique({ where: { key } });

    if (!page) {

      throw new NotFoundException("SitePage not found");

    }

    return page;

  }



  async getPublishedSitePageByKey(key: string) {

    const page = await this.prisma.sitePage.findFirst({

      where: { key, status: ContentStatus.PUBLISHED },

    });

    if (!page) {

      throw new NotFoundException("Published site page not found");

    }

    return page;

  }



  async upsertSitePage(params: {

    key: string;

    title: string;

    sectionsJson: string;

    seoTitle?: string | null;

    seoDescription?: string | null;

    status?: ContentStatus | null;

  }) {

    const sections = this.parseJsonString(params.sectionsJson, "sectionsJson");



    return this.prisma.sitePage.upsert({

      where: { key: params.key.trim() },

      create: {

        key: params.key.trim(),

        title: params.title,

        sections,

        seoTitle: params.seoTitle ?? undefined,

        seoDescription: params.seoDescription ?? undefined,

        status: params.status ?? ContentStatus.DRAFT,

      },

      update: {

        title: params.title,

        sections,

        seoTitle: params.seoTitle ?? undefined,

        seoDescription: params.seoDescription ?? undefined,

        ...(params.status != null ? { status: params.status } : {}),

      },

    });

  }



  async publishSitePage(key: string) {

    await this.getSitePageByKey(key);

    return this.prisma.sitePage.update({

      where: { key },

      data: {

        status: ContentStatus.PUBLISHED,

        publishedAt: new Date(),

      },

    });

  }



  async unpublishSitePage(key: string) {

    await this.getSitePageByKey(key);

    return this.prisma.sitePage.update({

      where: { key },

      data: { status: ContentStatus.DRAFT },

    });

  }

}


