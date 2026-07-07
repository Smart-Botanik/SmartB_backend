import type { CultureChipIconView } from "@growing/contracts";
import type { MediaRecord } from "./content-facets.types";

export type CultureOptionDto = {
  tagKey: string;
  tagId: string;
  label: string;
  hubSlug: string;
  sortOrder: number;
  icon: CultureChipIconView & {
    image: MediaRecord | null;
  };
  preview: MediaRecord | null;
};

export type CultureOptionsCatalogDto = {
  revision: string;
  options: CultureOptionDto[];
};
