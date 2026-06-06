import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TaxonomyTagResolver } from "./taxonomy-tag.resolver";
import { TaxonomyTagService } from "./taxonomy-tag.service";
import { TaxonomyRemoteGraphqlClient } from "./taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "./taxonomy-tag.remote-service";

/**
 * Bounded context: TaxonomyScope + TaxonomyTag — remote-only after BK-MS-TAX-3 cutover.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    TaxonomyRemoteGraphqlClient,
    TaxonomyTagRemoteService,
    { provide: TaxonomyTagService, useClass: TaxonomyTagRemoteService },
    TaxonomyTagResolver,
  ],
  exports: [TaxonomyTagService],
})
export class TaxonomyModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("TAXONOMY_SERVICE_URL")?.trim();
    const cutover =
      this.config.get<string>("TAXONOMY_CUTOVER")?.trim() !== "false";
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "TAXONOMY_CUTOVER requires TAXONOMY_SERVICE_URL (taxonomy-service)",
      );
    }
  }
}
