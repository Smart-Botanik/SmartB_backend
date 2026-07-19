import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ContentModule } from "../content/content.module";
import {
  TelegramBotApiService,
  TelegramBotCredentialsService,
} from "./telegram-bot-credentials.service";
import { TelegramHttpService } from "./telegram-http.service";
import {
  TelegramBotResolver,
  TelegramChannelResolver,
} from "./telegram-bots.resolver";
import { TelegramBotsService } from "./telegram-bots.service";
import { TelegramBotsRemoteService } from "./telegram-bots.remote-service";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramGuidePublicationsService } from "./telegram-guide-publications.service";
import { TelegramGuidePublicationsRemoteService } from "./telegram-guide-publications.remote-service";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";
import { TelegramGuidePublishRemoteService } from "./telegram-guide-publish.remote-service";
import { TelegramResolver } from "./telegram.resolver";
import { CropGuideTelegramPublicationResolver } from "./telegram-publications.resolver";

/**
 * Telegram bots/channels/publish — remote-only after BK-MS-CONTENT cutover.
 */
@Module({
  imports: [ConfigModule, ContentModule],
  providers: [
    TelegramHttpService,
    TelegramBotApiService,
    TelegramBotCredentialsService,
    TelegramBotsRemoteService,
    { provide: TelegramBotsService, useClass: TelegramBotsRemoteService },
    TelegramGuidePublicationsRemoteService,
    {
      provide: TelegramGuidePublicationsService,
      useClass: TelegramGuidePublicationsRemoteService,
    },
    TelegramGuidePublishRemoteService,
    {
      provide: TelegramGuidePublishService,
      useClass: TelegramGuidePublishRemoteService,
    },
    TelegramBotResolver,
    TelegramChannelResolver,
    TelegramBotService,
    TelegramResolver,
    CropGuideTelegramPublicationResolver,
  ],
  exports: [
    TelegramHttpService,
    TelegramBotApiService,
    TelegramBotCredentialsService,
    TelegramBotsService,
    TelegramBotService,
    TelegramGuidePublishService,
    TelegramGuidePublicationsService,
  ],
})
export class TelegramModule implements OnModuleInit {
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
