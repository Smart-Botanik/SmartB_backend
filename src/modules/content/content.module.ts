import { Module } from "@nestjs/common";
import { TaxonomyTagResolver } from "./taxonomy-tag.resolver";
import { TaxonomyTagService } from "./taxonomy-tag.service";
import { CropGuideResolver, SitePageResolver } from "./content.resolver";
import { ContentService } from "./content.service";

@Module({
  providers: [
    ContentService,
    TaxonomyTagService,
    CropGuideResolver,
    TaxonomyTagResolver,
    SitePageResolver,
  ],
  exports: [ContentService, TaxonomyTagService],
})
export class ContentModule {}
