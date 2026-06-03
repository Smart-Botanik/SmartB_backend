import { Module } from "@nestjs/common";
import { TaxonomyRepository } from "./taxonomy.repository";
import { TaxonomyTagResolver } from "./taxonomy-tag.resolver";
import { TaxonomyTagService } from "./taxonomy-tag.service";

@Module({
  providers: [TaxonomyRepository, TaxonomyTagService, TaxonomyTagResolver],
  exports: [TaxonomyTagService],
})
export class TaxonomyModule {}
