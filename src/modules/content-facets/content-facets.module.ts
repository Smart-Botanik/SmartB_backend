import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import {
  ContentFacetSlotResolver,
  ContentFacetsResolver,
} from "./content-facets.resolver";
import { ContentFacetsService } from "./content-facets.service";
import { CultureOptionsService } from "./culture-options.service";

@Module({
  imports: [TaxonomyModule],
  providers: [
    ContentFacetsService,
    CultureOptionsService,
    ContentFacetsResolver,
    ContentFacetSlotResolver,
  ],
  exports: [ContentFacetsService, CultureOptionsService],
})
export class ContentFacetsModule {}
