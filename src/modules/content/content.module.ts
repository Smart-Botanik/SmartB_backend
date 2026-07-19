import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ContentRemoteGraphqlClient } from "./content-remote.graphql-client";
import { ContentRemoteService } from "./content.remote-service";
import { CropGuideResolver, SitePageResolver } from "./content.resolver";
import { ContentService } from "./content.service";

/**
 * Bounded context: CropGuide + SitePage — remote-only after BK-MS-CONTENT cutover.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    ContentRemoteGraphqlClient,
    ContentRemoteService,
    { provide: ContentService, useClass: ContentRemoteService },
    CropGuideResolver,
    SitePageResolver,
  ],
  exports: [ContentService, ContentRemoteGraphqlClient],
})
export class ContentModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("CONTENT_SERVICE_URL")?.trim();
    const cutover =
      this.config.get<string>("CONTENT_CUTOVER")?.trim() !== "false";
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "CONTENT_CUTOVER requires CONTENT_SERVICE_URL (content-service)",
      );
    }
  }
}
