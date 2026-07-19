import { Injectable, NotFoundException } from "@nestjs/common";
import {
  extractMediaRefs,
  resolveMediaRefs,
} from "@growing/content-markdown";
import type { CropKind } from "@growing/contracts";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ContentRemoteGraphqlClient } from "./content-remote.graphql-client";
import {
  MUTATION_CREATE_CROP_GUIDE,
  MUTATION_DELETE_CROP_GUIDE,
  MUTATION_PUBLISH_CROP_GUIDE,
  MUTATION_PUBLISH_SITE_PAGE,
  MUTATION_UNPUBLISH_CROP_GUIDE,
  MUTATION_UNPUBLISH_SITE_PAGE,
  MUTATION_UPDATE_CROP_GUIDE,
  MUTATION_UPSERT_SITE_PAGE,
  QUERY_CROP_GUIDE,
  QUERY_CROP_GUIDE_BY_SLUG,
  QUERY_CROP_GUIDES,
  QUERY_PUBLISHED_CROP_GUIDE,
  QUERY_PUBLISHED_CROP_GUIDES,
  QUERY_PUBLISHED_SITE_PAGE,
  QUERY_SITE_PAGE,
  QUERY_SITE_PAGES,
} from "./content-remote.operations";
import { ContentService } from "./content.service";

type RemoteGuide = {
  id: string;
  taxonomyTags?: unknown[];
  [key: string]: unknown;
};

/**
 * BFF proxy to content-service (BK-MS-CONTENT cutover).
 * Media URL resolution stays local (BFF owns Media).
 */
@Injectable()
export class ContentRemoteService extends ContentService {
  constructor(
    private readonly remote: ContentRemoteGraphqlClient,
    private readonly mediaPrisma: PrismaService,
  ) {
    super();
  }

  async resolveCropGuideTaxonomyTags(guideId: string) {
    const data = await this.remote.execute<{ cropGuide: RemoteGuide | null }>(
      QUERY_CROP_GUIDE,
      { id: guideId },
    );
    if (!data.cropGuide) {
      throw new NotFoundException("CropGuide not found");
    }
    return (data.cropGuide.taxonomyTags ?? []) as Awaited<
      ReturnType<ContentService["resolveCropGuideTaxonomyTags"]>
    >;
  }

  async resolveMediaInMarkdown(markdown: string): Promise<string> {
    const ids = extractMediaRefs(markdown);
    if (ids.length === 0) return markdown;

    const media = await this.mediaPrisma.media.findMany({
      where: { id: { in: ids } },
      select: { id: true, url: true },
    });
    const urlById = Object.fromEntries(media.map(item => [item.id, item.url]));
    return resolveMediaRefs(markdown, urlById);
  }

  async listCropGuides(params: {
    limit?: number;
    offset?: number;
    cropKind?: CropKind | null;
    status?: ContentStatus | null;
    query?: string | null;
    termKey?: string | null;
  }) {
    const data = await this.remote.execute<{
      cropGuides: { items: unknown[]; total: number };
    }>(QUERY_CROP_GUIDES, {
      limit: params.limit ?? undefined,
      offset: params.offset ?? undefined,
      cropKind: params.cropKind ?? undefined,
      status: params.status ?? undefined,
      query: params.query ?? undefined,
      termKey: params.termKey ?? undefined,
    });
    return data.cropGuides;
  }

  async getCropGuideById(id: string) {
    const data = await this.remote.execute<{ cropGuide: unknown | null }>(
      QUERY_CROP_GUIDE,
      { id },
    );
    if (!data.cropGuide) {
      throw new NotFoundException("CropGuide not found");
    }
    return data.cropGuide;
  }

  async getCropGuideBySlug(slug: string) {
    const data = await this.remote.execute<{ cropGuideBySlug: unknown | null }>(
      QUERY_CROP_GUIDE_BY_SLUG,
      { slug },
    );
    if (!data.cropGuideBySlug) {
      throw new NotFoundException("CropGuide not found");
    }
    return data.cropGuideBySlug;
  }

  async listPublishedCropGuides(
    cropKind?: CropKind | null,
    termKey?: string | null,
  ) {
    const data = await this.remote.execute<{
      publishedCropGuides: unknown[];
    }>(QUERY_PUBLISHED_CROP_GUIDES, {
      cropKind: cropKind ?? undefined,
      termKey: termKey ?? undefined,
    });
    return data.publishedCropGuides;
  }

  async getPublishedCropGuideBySlug(slug: string) {
    const data = await this.remote.execute<{
      publishedCropGuide: unknown | null;
    }>(QUERY_PUBLISHED_CROP_GUIDE, { slug });
    if (!data.publishedCropGuide) {
      throw new NotFoundException("Published crop guide not found");
    }
    return data.publishedCropGuide;
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
    const data = await this.remote.execute<{ createCropGuide: unknown }>(
      MUTATION_CREATE_CROP_GUIDE,
      { input: params },
    );
    return data.createCropGuide;
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
    const { id, ...input } = params;
    const data = await this.remote.execute<{ updateCropGuide: unknown }>(
      MUTATION_UPDATE_CROP_GUIDE,
      { id, input },
    );
    return data.updateCropGuide;
  }

  async deleteCropGuide(id: string) {
    const data = await this.remote.execute<{ deleteCropGuide: boolean }>(
      MUTATION_DELETE_CROP_GUIDE,
      { id },
    );
    return data.deleteCropGuide;
  }

  async publishCropGuide(id: string) {
    const data = await this.remote.execute<{ publishCropGuide: unknown }>(
      MUTATION_PUBLISH_CROP_GUIDE,
      { id },
    );
    return data.publishCropGuide;
  }

  async unpublishCropGuide(id: string) {
    const data = await this.remote.execute<{ unpublishCropGuide: unknown }>(
      MUTATION_UNPUBLISH_CROP_GUIDE,
      { id },
    );
    return data.unpublishCropGuide;
  }

  async listSitePages(status?: ContentStatus | null) {
    const data = await this.remote.execute<{ sitePages: unknown[] }>(
      QUERY_SITE_PAGES,
      { status: status ?? undefined },
    );
    return data.sitePages;
  }

  async getSitePageByKey(key: string) {
    const data = await this.remote.execute<{ sitePage: unknown | null }>(
      QUERY_SITE_PAGE,
      { key },
    );
    if (!data.sitePage) {
      throw new NotFoundException("SitePage not found");
    }
    return data.sitePage;
  }

  async getPublishedSitePageByKey(key: string) {
    const data = await this.remote.execute<{
      publishedSitePage: unknown | null;
    }>(QUERY_PUBLISHED_SITE_PAGE, { key });
    if (!data.publishedSitePage) {
      throw new NotFoundException("Published site page not found");
    }
    return data.publishedSitePage;
  }

  async upsertSitePage(params: {
    key: string;
    title: string;
    sectionsJson: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    status?: ContentStatus | null;
  }) {
    const data = await this.remote.execute<{ upsertSitePage: unknown }>(
      MUTATION_UPSERT_SITE_PAGE,
      { input: params },
    );
    return data.upsertSitePage;
  }

  async publishSitePage(key: string) {
    const data = await this.remote.execute<{ publishSitePage: unknown }>(
      MUTATION_PUBLISH_SITE_PAGE,
      { key },
    );
    return data.publishSitePage;
  }

  async unpublishSitePage(key: string) {
    const data = await this.remote.execute<{ unpublishSitePage: unknown }>(
      MUTATION_UNPUBLISH_SITE_PAGE,
      { key },
    );
    return data.unpublishSitePage;
  }
}
