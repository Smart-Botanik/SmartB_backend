import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";
import { TelegramResolver } from "./telegram.resolver";

@Module({
  imports: [TaxonomyModule],
  providers: [
    TelegramBotService,
    TelegramGuidePublishService,
    TelegramResolver,
  ],
  exports: [TelegramBotService, TelegramGuidePublishService],
})
export class TelegramModule {}
