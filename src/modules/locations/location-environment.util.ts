import {
  ENVIRONMENT_VARIANT_TO_LOCATION_SUB_TYPE,
  environmentGroupSlugFromVariantKey,
  type FlatTaxonomyTag,
} from "@growing/contracts";
import type { LocationSubType, LocationType } from "@prisma/client";

const GROUP_SLUG_TO_LOCATION_TYPE: Record<string, LocationType> = {
  indoor: "indoor",
  outdoor: "outdoor",
  greenhouse: "greenhouse",
};

export type EnvironmentTagResolution = {
  environmentTagId: string;
  environmentGroupSlug: string | null;
  type: LocationType | null;
  subType: LocationSubType | null;
};

export function resolveEnvironmentFieldsFromTag(
  tag: FlatTaxonomyTag,
): EnvironmentTagResolution {
  if (tag.namespace !== "ENVIRONMENT_VARIANT") {
    throw new Error("expected ENVIRONMENT_VARIANT");
  }
  const groupSlug = environmentGroupSlugFromVariantKey(tag.key);
  const subType = ENVIRONMENT_VARIANT_TO_LOCATION_SUB_TYPE[tag.key] ?? null;
  const type = groupSlug ? (GROUP_SLUG_TO_LOCATION_TYPE[groupSlug] ?? null) : null;
  return {
    environmentTagId: tag.id,
    environmentGroupSlug: groupSlug,
    type,
    subType,
  };
}
