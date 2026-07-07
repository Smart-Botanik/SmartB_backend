import {
  buildContentFacetWords,
  pickChipIconText,
  pickFacetMediaIds,
  type ContentFacetSlotRecord,
} from "@growing/contracts";
import type {
  ContentFacetBundleDto,
  ContentFacetProfileWithSlots,
  MediaRecord,
} from "./content-facets.types";

export function toContentFacetBundle(
  profile: ContentFacetProfileWithSlots,
  mediaById: Map<string, MediaRecord>,
): ContentFacetBundleDto {
  const slotRecords: ContentFacetSlotRecord[] = profile.slots.map(slot => ({
    kind: slot.kind,
    role: slot.role,
    mediaId: slot.mediaId,
    textValue: slot.textValue,
    sortOrder: slot.sortOrder,
  }));

  const picked = pickFacetMediaIds(slotRecords);
  const resolve = (id?: string | null) =>
    id ? (mediaById.get(id) ?? null) : null;

  return {
    subjectType: profile.subjectType,
    subjectId: profile.subjectId,
    subjectKey: profile.subjectKey,
    profileKind: profile.profileKind,
    revision: profile.revision,
    chipIcon: pickChipIconText(slotRecords),
    logo: resolve(picked.logoMediaId),
    imageM: resolve(picked.imageMMediaId),
    previews: picked.previewMediaIds
      .map(id => mediaById.get(id))
      .filter((item): item is MediaRecord => Boolean(item)),
    randomImages: picked.randomImageMediaIds
      .map(id => mediaById.get(id))
      .filter((item): item is MediaRecord => Boolean(item)),
    words: buildContentFacetWords(slotRecords),
  };
}
