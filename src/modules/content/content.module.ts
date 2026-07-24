import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
  forwardRef,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MediaModule } from "../media/media.module";
import { ContentRemoteGraphqlClient } from "./content-remote.graphql-client";
import { ContentRemoteService } from "./content.remote-service";
import { CalendarResolver } from "./calendar.resolver";
import { CropGuideResolver, SitePageResolver } from "./content.resolver";
import { ContentService } from "./content.service";

/**
 * Bounded context: CropGuide + SitePage + CalendarDay — remote-only after BK-MS-CONTENT cutover.
 */
@Module({
  imports: [ConfigModule, forwardRef(() => MediaModule)],
  providers: [
    ContentRemoteGraphqlClient,
    ContentRemoteService,
    { provide: ContentService, useClass: ContentRemoteService },
    CropGuideResolver,
    SitePageResolver,
    CalendarResolver,
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
