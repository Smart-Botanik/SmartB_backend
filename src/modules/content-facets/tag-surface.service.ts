import { Injectable } from "@nestjs/common";
import {
  cropHubSlugFromTagKey,
  inferProfileKindForTaxonomyTag,
} from "@growing/contracts";
import { createHash } from "node:crypto";
import { ContentService } from "../content/content.service";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { ContentFacetsService } from "./content-facets.service";
import type { ContentFacetSubjectInput } from "./content-facets.types";

type TaxonomyTagRow = {
  id: string;
  key: string;
  label: string;
  scopeKey: string;
  namespace: string;
  sortOrder: number;
  parentId?: string | null;
  cropKind?: string | null;
};

@Injectable()
export class TagSurfaceService {
  constructor(
    private readonly taxonomyTagService: TaxonomyTagService,
    private readonly contentFacetsService: ContentFacetsService,
    private readonly contentService: ContentService,
  ) {}

  private computeRevision(parts: string[]): string {
    return createHash("sha256")
      .update(parts.filter(Boolean).join("|"))
      .digest("hex")
      .slice(0, 16);
  }

  async getPublishedTagSurface(tagKey: string) {
    const tags = (await this.taxonomyTagService.tagsByKeys([tagKey])) as TaxonomyTagRow[];
    const tag = tags[0];
    if (!tag) {
      return null;
    }

    const profileKind = inferProfileKindForTaxonomyTag({
      scopeKey: tag.scopeKey,
      namespace: tag.namespace,
      parentId: tag.parentId,
    });

    const subject: ContentFacetSubjectInput = {
      type: "TAXONOMY_TAG",
      id: tag.id,
      key: tag.key,
    };

    const facets =
      profileKind != null
        ? await this.contentFacetsService.findPublishedBundle(subject)
        : null;

    const guides = await this.contentService.listPublishedCropGuides(null, tagKey);

    const guideRevisions = (guides as Array<{ publishedAt?: string | Date | null }>)
      .map(guide =>
        guide.publishedAt ? new Date(guide.publishedAt).toISOString() : "",
      )
      .filter(Boolean);

    const revision = this.computeRevision([
      facets?.revision ?? "",
      ...guideRevisions,
      tag.id,
    ]);

    return {
      revision,
      tag,
      facets,
      guides,
      products: [],
      brands: [],
    };
  }
}
