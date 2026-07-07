import type {
  ContentFacetKind,
  ContentFacetProfileKind,
  ContentFacetSubjectType,
} from "@prisma/client";

export type ContentFacetSubjectInput = {
  type: ContentFacetSubjectType;
  id: string;
  key?: string | null;
};

export type ContentFacetSlotInput = {
  kind: ContentFacetKind;
  role?: string | null;
  mediaId?: string | null;
  textValue?: string | null;
  sortOrder?: number | null;
};

export type UpsertContentFacetProfileParams = {
  subject: ContentFacetSubjectInput;
  profileKind: ContentFacetProfileKind;
  slots: ContentFacetSlotInput[];
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
  slots: Array<{
    id: string;
    profileId: string;
    kind: ContentFacetKind;
    role: string | null;
    mediaId: string | null;
    textValue: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export type MediaRecord = {
  id: string;
  url: string;
  mime: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export type ContentFacetBundleDto = {
  subjectType: ContentFacetSubjectType;
  subjectId: string;
  subjectKey: string | null;
  profileKind: ContentFacetProfileKind;
  revision: string;
  logo: MediaRecord | null;
  imageM: MediaRecord | null;
  previews: MediaRecord[];
  randomImages: MediaRecord[];
  words: {
    hubTitle?: string | null;
    hubLead?: string | null;
    chipCaption?: string | null;
    seoDescription?: string | null;
    aboutShort?: string | null;
    highlight?: string | null;
  };
};
