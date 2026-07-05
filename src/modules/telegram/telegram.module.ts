import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
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
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramGuidePublicationsService } from "./telegram-guide-publications.service";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";
import { TelegramResolver } from "./telegram.resolver";
import { CropGuideTelegramPublicationResolver } from "./telegram-publications.resolver";

@Module({
  imports: [TaxonomyModule],
  providers: [
    TelegramHttpService,
    TelegramBotApiService,
    TelegramBotCredentialsService,
    TelegramBotsService,
    TelegramBotResolver,
    TelegramChannelResolver,
    TelegramBotService,
    TelegramGuidePublishService,
    TelegramGuidePublicationsService,
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
export class TelegramModule {}
