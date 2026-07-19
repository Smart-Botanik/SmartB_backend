import { Injectable } from "@nestjs/common";
import type {
  ContentFacetProfileKind,
  ContentFacetSubjectType,
} from "@growing/contracts";
import type {
  ContentFacetBundleDto,
  ContentFacetProfileWithSlots,
  ContentFacetSubjectInput,
  MediaRecord,
  UpsertContentFacetProfileParams,
} from "./content-facets.types";

/** DI token; runtime: {@link ContentFacetsRemoteService} (BK-MS-EDGES cutover). */
@Injectable()
export abstract class ContentFacetsService {
  abstract getProfileBySubject(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots | null>;

  abstract findPublishedBundle(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetBundleDto | null>;

  abstract getPublishedBundle(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetBundleDto>;

  abstract getPublishedBundlesBatch(
    subjects: ContentFacetSubjectInput[],
  ): Promise<ContentFacetBundleDto[]>;

  abstract upsertProfile(
    params: UpsertContentFacetProfileParams,
  ): Promise<ContentFacetProfileWithSlots>;

  abstract publishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots>;

  abstract unpublishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots>;

  abstract resolveSlotMedia(mediaId?: string | null): Promise<MediaRecord | null>;
}

export type ContentFacetUpsertInput = {
  subject: {
    type: ContentFacetSubjectType;
    id: string;
    key?: string | null;
  };
  profileKind: ContentFacetProfileKind;
  slots: UpsertContentFacetProfileParams["slots"];
};
