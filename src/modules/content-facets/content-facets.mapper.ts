import {
  pickFacetMediaIds,
  type ContentFacetSlotRecord,
} from "@growing/contracts";
import type {
  ContentFacetBundleDto,
  MediaRecord,
} from "./content-facets.types";

export function stitchContentFacetBundleMedia(
  bundle: ContentFacetBundleDto,
  slots: ContentFacetSlotRecord[],
  mediaById: Map<string, MediaRecord>,
): ContentFacetBundleDto {
  const { logoMediaId, imageMMediaId, previewMediaIds, randomImageMediaIds } =
    pickFacetMediaIds(slots);

  const resolve = (id?: string | null): MediaRecord | null => {
    if (!id) return null;
    return mediaById.get(id) ?? null;
  };

  return {
    ...bundle,
    logo: resolve(logoMediaId),
    imageM: resolve(imageMMediaId),
    previews: previewMediaIds
      .map(id => resolve(id))
      .filter((item): item is MediaRecord => Boolean(item)),
    randomImages: randomImageMediaIds
      .map(id => resolve(id))
      .filter((item): item is MediaRecord => Boolean(item)),
  };
}

export function slotsToRecords(
  slots: Array<{
    kind: string;
    role?: string | null;
    mediaId?: string | null;
    textValue?: string | null;
    sortOrder?: number;
  }>,
): ContentFacetSlotRecord[] {
  return slots.map(slot => ({
    kind: slot.kind as ContentFacetSlotRecord["kind"],
    role: slot.role,
    mediaId: slot.mediaId,
    textValue: slot.textValue,
    sortOrder: slot.sortOrder,
  }));
}
