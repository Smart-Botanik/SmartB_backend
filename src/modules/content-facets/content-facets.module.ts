import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import {
  ContentFacetSlotResolver,
  ContentFacetsResolver,
} from "./content-facets.resolver";
import { ContentFacetsService } from "./content-facets.service";

@Module({
  imports: [TaxonomyModule],
  providers: [
    ContentFacetsService,
    ContentFacetsResolver,
    ContentFacetSlotResolver,
  ],
  exports: [ContentFacetsService],
})
export class ContentFacetsModule {}
