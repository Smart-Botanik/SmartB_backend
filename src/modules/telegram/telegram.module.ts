import { Module } from "@nestjs/common";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";
import { TelegramResolver } from "./telegram.resolver";

@Module({
  providers: [
    TelegramBotService,
    TelegramGuidePublishService,
    TelegramResolver,
  ],
  exports: [TelegramBotService, TelegramGuidePublishService],
})
export class TelegramModule {}
