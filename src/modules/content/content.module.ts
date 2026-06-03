import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { CropGuideResolver, SitePageResolver } from "./content.resolver";
import { ContentService } from "./content.service";

@Module({
  imports: [TaxonomyModule],
  providers: [ContentService, CropGuideResolver, SitePageResolver],
  exports: [ContentService],
})
export class ContentModule {}
