import type {
  ContentFacetProfileKind,
  ContentFacetSubjectType,
  ContentFacetWords,
} from "@growing/contracts";
import type { ContentFacetSlotRecord } from "@growing/contracts";

export type ContentFacetSubjectInput = {
  type: ContentFacetSubjectType;
  id: string;
  key?: string | null;
};

export type UpsertContentFacetProfileParams = {
  subject: ContentFacetSubjectInput;
  profileKind: ContentFacetProfileKind;
  slots: ContentFacetSlotRecord[];
};

export type MediaRecord = {
  id: string;
  url: string;
  mime?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
};

export type ContentFacetSlotRow = {
  id: string;
  kind: string;
  role: string | null;
  mediaId: string | null;
  textValue: string | null;
  sortOrder: number;
};

export type ContentFacetProfileWithSlots = {
  id: string;
  subjectType: ContentFacetSubjectType;
  subjectId: string;
  subjectKey: string | null;
  profileKind: ContentFacetProfileKind;
  status: string;
  revision: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  slots: ContentFacetSlotRow[];
};

export type ContentFacetBundleDto = {
  subjectType: ContentFacetSubjectType;
  subjectId: string;
  subjectKey: string | null;
  profileKind: ContentFacetProfileKind;
  revision: string;
  chipIcon: string | null;
  logo: MediaRecord | null;
  imageM: MediaRecord | null;
  previews: MediaRecord[];
  randomImages: MediaRecord[];
  words: ContentFacetWords;
};
