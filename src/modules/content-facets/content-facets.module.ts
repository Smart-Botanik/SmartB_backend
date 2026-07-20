import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ContentModule } from "../content/content.module";
import { MediaModule } from "../media/media.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { ContentEdgesRemoteGraphqlClient } from "./content-edges-remote.graphql-client";
import { ContentFacetsRemoteService } from "./content-facets.remote-service";
import {
  ContentFacetSlotResolver,
  ContentFacetsResolver,
} from "./content-facets.resolver";
import { ContentFacetsService } from "./content-facets.service";
import { CultureOptionsService } from "./culture-options.service";
import { TagSurfaceService } from "./tag-surface.service";

/**
 * Presentation facets — remote-only to content-edges after BK-MS-EDGES cutover.
 * TagSurface / CultureOptions orchestration stays in BFF (ADR-0015 §5).
 */
@Module({
  imports: [ConfigModule, MediaModule, TaxonomyModule, ContentModule],
  providers: [
    ContentEdgesRemoteGraphqlClient,
    ContentFacetsRemoteService,
    { provide: ContentFacetsService, useClass: ContentFacetsRemoteService },
    CultureOptionsService,
    TagSurfaceService,
    ContentFacetsResolver,
    ContentFacetSlotResolver,
  ],
  exports: [ContentFacetsService, CultureOptionsService, TagSurfaceService],
})
export class ContentFacetsModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("CONTENT_EDGES_SERVICE_URL")?.trim();
    const cutover =
      this.config.get<string>("CONTENT_EDGES_CUTOVER")?.trim() !== "false";
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "CONTENT_EDGES_CUTOVER requires CONTENT_EDGES_SERVICE_URL (content-edges)",
      );
    }
  }
}
