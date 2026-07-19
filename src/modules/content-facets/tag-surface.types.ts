import type { ContentFacetBundleDto } from "./content-facets.types";

export type TagSurfaceDto = {
  revision: string;
  tag: Record<string, unknown>;
  facets: ContentFacetBundleDto | null;
  guides: unknown[];
  products: unknown[];
  brands: unknown[];
};
