import { Injectable } from "@nestjs/common";
import type { CropKind } from "@growing/contracts";
import { ContentStatus } from "@prisma/client";

/** DI token; runtime: {@link ContentRemoteService} (BK-MS-CONTENT cutover). */
@Injectable()
export abstract class ContentService {
  abstract resolveCropGuideTaxonomyTags(guideId: string): Promise<unknown[]>;

  abstract resolveMediaInMarkdown(markdown: string): Promise<string>;

  abstract listCropGuides(params: {
    limit?: number;
    offset?: number;
    cropKind?: CropKind | null;
    status?: ContentStatus | null;
    query?: string | null;
    termKey?: string | null;
  }): Promise<{ items: unknown[]; total: number }>;

  abstract getCropGuideById(id: string): Promise<unknown>;

  abstract getCropGuideBySlug(slug: string): Promise<unknown>;

  abstract listPublishedCropGuides(
    cropKind?: CropKind | null,
    termKey?: string | null,
  ): Promise<unknown[]>;

  abstract getPublishedCropGuideBySlug(slug: string): Promise<unknown>;

  abstract createCropGuide(params: {
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
  }): Promise<unknown>;

  abstract updateCropGuide(params: {
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
  }): Promise<unknown>;

  abstract deleteCropGuide(id: string): Promise<boolean>;

  abstract publishCropGuide(id: string): Promise<unknown>;

  abstract unpublishCropGuide(id: string): Promise<unknown>;

  abstract listSitePages(status?: ContentStatus | null): Promise<unknown[]>;

  abstract getSitePageByKey(key: string): Promise<unknown>;

  abstract getPublishedSitePageByKey(key: string): Promise<unknown>;

  abstract upsertSitePage(params: {
    key: string;
    title: string;
    sectionsJson: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    status?: ContentStatus | null;
  }): Promise<unknown>;

  abstract publishSitePage(key: string): Promise<unknown>;

  abstract unpublishSitePage(key: string): Promise<unknown>;

  abstract listPublishedCalendarDays(params: {
    from: string;
    to: string;
    taxonomyTagIds?: string[] | null;
    activityKind?: string | null;
  }): Promise<unknown[]>;

  abstract getPublishedCalendarDay(date: string): Promise<unknown>;

  abstract listCalendarDays(params: {
    from: string;
    to: string;
    status?: ContentStatus | null;
    taxonomyTagIds?: string[] | null;
    activityKind?: string | null;
  }): Promise<unknown[]>;

  abstract getCalendarDay(date: string): Promise<unknown>;

  abstract upsertCalendarDay(params: {
    date: string;
    title?: string | null;
    bodyMd?: string | null;
    moonPhase?: string | null;
    moonZodiacSign?: string | null;
    generalState?: string | null;
    metaJson?: string | null;
    status?: ContentStatus | null;
    cultureMarks?: Array<{
      taxonomyTagId: string;
      activityKind: string;
      favorability: string;
      note?: string | null;
    }> | null;
  }): Promise<unknown>;

  abstract publishCalendarDay(date: string): Promise<unknown>;

  abstract unpublishCalendarDay(date: string): Promise<unknown>;

  abstract setCalendarDayCultureMarks(
    date: string,
    marks: Array<{
      taxonomyTagId: string;
      activityKind: string;
      favorability: string;
      note?: string | null;
    }>,
  ): Promise<unknown>;
}
