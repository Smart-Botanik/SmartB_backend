import { BadRequestException, Injectable } from "@nestjs/common";
import {
  buildTaxonomyConsumerCatalog,
  computeTaxonomyCatalogRevision,
  flattenTaxonomyForestFromNested,
  GRAPHQL_TAXONOMY_CONSUMER_PROFILE_TO_VALUE,
  graphqlProfileForConsumerRequest,
  LOCATION_ENVIRONMENT_PROFILE_CONFIG,
  scopeKeyForConsumerProfile,
  type FlatTaxonomyTag,
} from "@growing/contracts";
import { TaxonomyTagService } from "./taxonomy-tag.service";

type NestedTaxonomyTag = FlatTaxonomyTag & {
  children?: NestedTaxonomyTag[];
  updatedAt?: string | Date | null;
};

@Injectable()
export class TaxonomyConsumerCatalogService {
  constructor(private readonly taxonomyTagService: TaxonomyTagService) {}

  async getCatalog(graphqlProfile: string) {
    const profile = GRAPHQL_TAXONOMY_CONSUMER_PROFILE_TO_VALUE[graphqlProfile];
    if (!profile) {
      throw new BadRequestException(`taxonomyConsumerCatalog: unknown profile ${graphqlProfile}`);
    }

    const forest = (await this.taxonomyTagService.forest(
      scopeKeyForConsumerProfile(profile),
      "ACTIVE",
    )) as NestedTaxonomyTag[];

    const flat = flattenTaxonomyForestFromNested(forest);
    const revision = computeTaxonomyCatalogRevision(flat);
    const catalog = buildTaxonomyConsumerCatalog(
      profile,
      flat,
      revision,
      graphqlProfileForConsumerRequest(graphqlProfile),
    );

    if (!catalog) {
      throw new BadRequestException(`taxonomyConsumerCatalog: profile not supported: ${profile}`);
    }

    return catalog;
  }

  /** Resolve tag id → spec profile (для валидации specBlocks на бэке). */
  async specProfileForTagId(tagId: string) {
    const tag = (await this.taxonomyTagService.getById(tagId)) as FlatTaxonomyTag;
    const flat = [tag];
    const catalog = buildTaxonomyConsumerCatalog(
      LOCATION_ENVIRONMENT_PROFILE_CONFIG.profile,
      flat,
      "0",
    );
    return catalog?.options[0]?.specProfile ?? null;
  }
}
