import { Injectable } from "@nestjs/common";
import {
  cropHubSlugFromTagKey,
  resolveCultureChipIcon,
  TAXONOMY_CROPS_LIST_PATH,
  type FlatTaxonomyTag,
} from "@growing/contracts";
import { createHash } from "node:crypto";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { ContentFacetsService } from "./content-facets.service";
import type {
  ContentFacetBundleDto,
  ContentFacetSubjectInput,
} from "./content-facets.types";
import type {
  CultureOptionDto,
  CultureOptionsCatalogDto,
} from "./culture-options.types";

type TaxonomyCropTag = FlatTaxonomyTag & { id: string; key: string; label: string };

@Injectable()
export class CultureOptionsService {
  constructor(
    private readonly taxonomyTagService: TaxonomyTagService,
    private readonly contentFacetsService: ContentFacetsService,
  ) {}

  private computeCatalogRevision(
    crops: TaxonomyCropTag[],
    bundles: ContentFacetBundleDto[],
  ): string {
    const payload = JSON.stringify({
      crops: crops.map(c => ({
        id: c.id,
        key: c.key,
        label: c.label,
        sortOrder: c.sortOrder,
        updatedAt: c.updatedAt ?? null,
      })),
      facets: bundles.map(b => ({
        subjectId: b.subjectId,
        revision: b.revision,
      })),
    });
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  private buildCultureOption(
    crop: TaxonomyCropTag,
    bundle: ContentFacetBundleDto | undefined,
  ): CultureOptionDto {
    const iconResolved = resolveCultureChipIcon({
      tagKey: crop.key,
      chipIconText: bundle?.chipIcon ?? null,
      logoMediaId: bundle?.logo?.id ?? null,
    });

    const preview =
      bundle?.imageM ?? bundle?.previews[0] ?? bundle?.randomImages[0] ?? null;

    return {
      tagKey: crop.key,
      tagId: crop.id,
      label: crop.label,
      hubSlug: cropHubSlugFromTagKey(crop.key),
      sortOrder: crop.sortOrder ?? 0,
      icon: {
        ...iconResolved,
        image:
          iconResolved.kind === "MEDIA" && bundle?.logo ? bundle.logo : null,
      },
      preview,
    };
  }

  async getPublishedCultureOptions(): Promise<CultureOptionsCatalogDto> {
    const page = await this.taxonomyTagService.list({
      scopeKey: TAXONOMY_CROPS_LIST_PATH.scopeKey,
      namespace: TAXONOMY_CROPS_LIST_PATH.namespace,
      parentId: null,
      status: "ACTIVE",
      limit: 500,
      offset: 0,
    });

    const crops = (page.items as TaxonomyCropTag[]).sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.label.localeCompare(b.label, "ru"),
    );

    const subjects: ContentFacetSubjectInput[] = crops.map(crop => ({
      type: "TAXONOMY_TAG",
      id: crop.id,
      key: crop.key,
    }));

    const bundles = await this.contentFacetsService.getPublishedBundlesBatch(subjects);
    const bundleBySubjectId = new Map(bundles.map(b => [b.subjectId, b]));

    const options = crops.map(crop =>
      this.buildCultureOption(crop, bundleBySubjectId.get(crop.id)),
    );

    return {
      revision: this.computeCatalogRevision(crops, bundles),
      options,
    };
  }
}
