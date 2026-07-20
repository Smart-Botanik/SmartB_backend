import { Injectable, NotFoundException } from "@nestjs/common";
import { MediaService } from "../media/media.service";
import { ContentEdgesRemoteGraphqlClient } from "./content-edges-remote.graphql-client";
import {
  slotsToRecords,
  stitchContentFacetBundleMedia,
} from "./content-facets.mapper";
import {
  MUTATION_PUBLISH_CONTENT_FACET_PROFILE,
  MUTATION_UNPUBLISH_CONTENT_FACET_PROFILE,
  MUTATION_UPSERT_CONTENT_FACET_PROFILE,
  QUERY_CONTENT_FACET_PROFILE,
  QUERY_PUBLISHED_CONTENT_FACETS,
  QUERY_PUBLISHED_CONTENT_FACETS_BATCH,
} from "./content-facets-remote.operations";
import { ContentFacetsService } from "./content-facets.service";
import type {
  ContentFacetBundleDto,
  ContentFacetProfileWithSlots,
  ContentFacetSubjectInput,
  MediaRecord,
  UpsertContentFacetProfileParams,
} from "./content-facets.types";

/**
 * BFF proxy to content-edges (BK-MS-EDGES cutover).
 * Media URL resolution via MediaService (ADR-0018 / media-service).
 */
@Injectable()
export class ContentFacetsRemoteService extends ContentFacetsService {
  constructor(
    private readonly remote: ContentEdgesRemoteGraphqlClient,
    private readonly mediaService: MediaService,
  ) {
    super();
  }

  private toFacetMedia(row: {
    id: string;
    url: string;
    mime?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
    createdAt: string | Date;
  }): MediaRecord {
    return {
      id: row.id,
      url: row.url,
      mime: row.mime,
      size: row.size,
      width: row.width,
      height: row.height,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(row.createdAt),
    };
  }

  private async loadMediaMap(ids: string[]): Promise<Map<string, MediaRecord>> {
    if (ids.length === 0) {
      return new Map();
    }

    const rows = await this.mediaService.findManyByIds(ids);

    return new Map(
      rows.map(row => [row.id, this.toFacetMedia(row)]),
    );
  }

  private collectMediaIdsFromSlots(
    slots: Array<{ mediaId?: string | null }>,
  ): string[] {
    return [
      ...new Set(
        slots
          .map(slot => slot.mediaId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  }

  private async stitchBundle(
    bundle: ContentFacetBundleDto,
    slots: ContentFacetProfileWithSlots["slots"],
  ): Promise<ContentFacetBundleDto> {
    const slotRecords = slotsToRecords(slots);
    const mediaById = await this.loadMediaMap(this.collectMediaIdsFromSlots(slots));
    return stitchContentFacetBundleMedia(bundle, slotRecords, mediaById);
  }

  private async fetchProfileSlots(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots["slots"]> {
    try {
      const data = await this.remote.execute<{
        contentFacetProfile: ContentFacetProfileWithSlots | null;
      }>(QUERY_CONTENT_FACET_PROFILE, { subject });
      return data.contentFacetProfile?.slots ?? [];
    } catch (error) {
      if (error instanceof NotFoundException) {
        return [];
      }
      throw error;
    }
  }

  async getProfileBySubject(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots | null> {
    try {
      const data = await this.remote.execute<{
        contentFacetProfile: ContentFacetProfileWithSlots | null;
      }>(QUERY_CONTENT_FACET_PROFILE, { subject });
      return data.contentFacetProfile ?? null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  async findPublishedBundle(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetBundleDto | null> {
    const data = await this.remote.execute<{
      publishedContentFacets: ContentFacetBundleDto | null;
    }>(QUERY_PUBLISHED_CONTENT_FACETS, { subject });
    const bundle = data.publishedContentFacets;
    if (!bundle) {
      return null;
    }

    const slots = await this.fetchProfileSlots(subject);
    return this.stitchBundle(bundle, slots);
  }

  async getPublishedBundle(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetBundleDto> {
    const bundle = await this.findPublishedBundle(subject);
    if (!bundle) {
      throw new NotFoundException("Published content facet profile not found");
    }
    return bundle;
  }

  async getPublishedBundlesBatch(
    subjects: ContentFacetSubjectInput[],
  ): Promise<ContentFacetBundleDto[]> {
    if (subjects.length === 0) {
      return [];
    }

    const data = await this.remote.execute<{
      publishedContentFacetsBatch: ContentFacetBundleDto[];
    }>(QUERY_PUBLISHED_CONTENT_FACETS_BATCH, { subjects });

    const bundles = await Promise.all(
      data.publishedContentFacetsBatch.map(async bundle => {
        const slots = await this.fetchProfileSlots({
          type: bundle.subjectType,
          id: bundle.subjectId,
          key: bundle.subjectKey,
        });
        return this.stitchBundle(bundle, slots);
      }),
    );

    const orderKey = (subject: ContentFacetSubjectInput) =>
      `${subject.type}:${subject.id}`;
    const bundleByKey = new Map(
      bundles.map(bundle => [
        `${bundle.subjectType}:${bundle.subjectId}`,
        bundle,
      ]),
    );

    return subjects
      .map(subject => bundleByKey.get(orderKey(subject)))
      .filter((bundle): bundle is ContentFacetBundleDto => Boolean(bundle));
  }

  async upsertProfile(
    params: UpsertContentFacetProfileParams,
  ): Promise<ContentFacetProfileWithSlots> {
    const data = await this.remote.execute<{
      upsertContentFacetProfile: ContentFacetProfileWithSlots;
    }>(MUTATION_UPSERT_CONTENT_FACET_PROFILE, { input: params });
    return data.upsertContentFacetProfile;
  }

  async publishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots> {
    const data = await this.remote.execute<{
      publishContentFacetProfile: ContentFacetProfileWithSlots;
    }>(MUTATION_PUBLISH_CONTENT_FACET_PROFILE, { subject });
    return data.publishContentFacetProfile;
  }

  async unpublishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots> {
    const data = await this.remote.execute<{
      unpublishContentFacetProfile: ContentFacetProfileWithSlots;
    }>(MUTATION_UNPUBLISH_CONTENT_FACET_PROFILE, { subject });
    return data.unpublishContentFacetProfile;
  }

  async resolveSlotMedia(mediaId?: string | null): Promise<MediaRecord | null> {
    if (!mediaId) return null;

    const media = await this.mediaService.getMediaById(mediaId);
    if (!media) return null;

    return this.toFacetMedia(media);
  }
}
