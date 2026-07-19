import { Injectable } from "@nestjs/common";

/** DI token; runtime: {@link TelegramGuidePublicationsRemoteService}. */
@Injectable()
export abstract class TelegramGuidePublicationsService {
  abstract listByGuideId(
    cropGuideId: string,
    limit?: number,
  ): Promise<unknown[]>;

  abstract recordPublication(params: {
    cropGuideId: string;
    channelId?: string | null;
    botId?: string | null;
    channelName?: string | null;
    botName?: string | null;
    telegramMessageId: string;
    telegramPostUrl?: string | null;
    publishedAt?: Date;
  }): Promise<unknown>;
}
