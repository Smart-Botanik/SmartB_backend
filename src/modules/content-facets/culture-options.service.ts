import { Injectable } from "@nestjs/common";
import {
  cropHubSlugFromTagKey,
  resolveCultureChipIcon,
  TAXONOMY_CROPS_LIST_PATH,
} from "@growing/contracts";
import { createHash } from "node:crypto";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { ContentFacetsService } from "./content-facets.service";
import type { ContentFacetSubjectInput } from "./content-facets.types";

type TaxonomyTagRow = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  parentId?: string | null;
  namespace: string;
};

@Injectable()
export class CultureOptionsService {
  constructor(
    private readonly taxonomyTagService: TaxonomyTagService,
    private readonly contentFacetsService: ContentFacetsService,
  ) {}

  private computeRevision(parts: string[]): string {
    return createHash("sha256")
      .update(parts.filter(Boolean).join("|"))
      .digest("hex")
      .slice(0, 16);
  }

  async getPublishedCultureOptions() {
    const forest = (await this.taxonomyTagService.forest(
      TAXONOMY_CROPS_LIST_PATH.scopeKey,
      "ACTIVE",
    )) as TaxonomyTagRow[];

    const roots = forest
      .filter(
        tag =>
          !tag.parentId &&
          tag.namespace === TAXONOMY_CROPS_LIST_PATH.namespace,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const subjects: ContentFacetSubjectInput[] = roots.map(tag => ({
      type: "TAXONOMY_TAG",
      id: tag.id,
      key: tag.key,
    }));

    const bundles = await this.contentFacetsService.getPublishedBundlesBatch(
      subjects,
    );
    const bundleBySubjectId = new Map(
      bundles.map(bundle => [bundle.subjectId, bundle]),
    );

    const options = roots.map(tag => {
      const bundle = bundleBySubjectId.get(tag.id);
      const iconView = resolveCultureChipIcon({
        tagKey: tag.key,
        chipIconText: bundle?.chipIcon,
        logoMediaId: bundle?.logo?.id ?? null,
      });

      return {
        tagKey: tag.key,
        tagId: tag.id,
        label: tag.label,
        hubSlug: cropHubSlugFromTagKey(tag.key),
        sortOrder: tag.sortOrder,
        icon: {
          kind: iconView.kind,
          emoji: iconView.emoji ?? null,
          image: iconView.kind === "MEDIA" ? bundle?.logo ?? null : null,
        },
        preview: bundle?.imageM ?? bundle?.previews[0] ?? null,
      };
    });

    const revision = this.computeRevision([
      ...bundles.map(bundle => bundle.revision),
      ...roots.map(tag => tag.id),
    ]);

    return { revision, options };
  }
}
