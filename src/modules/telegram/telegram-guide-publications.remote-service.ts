import { Injectable } from "@nestjs/common";
import { ContentRemoteGraphqlClient } from "../content/content-remote.graphql-client";
import { QUERY_CROP_GUIDE_TELEGRAM_PUBLICATIONS } from "./telegram-remote.operations";
import { TelegramGuidePublicationsService } from "./telegram-guide-publications.service";

/**
 * BFF proxy for crop-guide Telegram publication log → content-service.
 */
@Injectable()
export class TelegramGuidePublicationsRemoteService extends TelegramGuidePublicationsService {
  constructor(private readonly remote: ContentRemoteGraphqlClient) {
    super();
  }

  async listByGuideId(cropGuideId: string, limit = 4) {
    const data = await this.remote.execute<{
      cropGuideTelegramPublications: unknown[];
    }>(QUERY_CROP_GUIDE_TELEGRAM_PUBLICATIONS, {
      cropGuideId,
      limit,
    });
    return data.cropGuideTelegramPublications;
  }

  async recordPublication(_params: {
    cropGuideId: string;
    channelId?: string | null;
    botId?: string | null;
    channelName?: string | null;
    botName?: string | null;
    telegramMessageId: string;
    telegramPostUrl?: string | null;
    publishedAt?: Date;
  }): Promise<unknown> {
    // Publishing is owned by content-service via publishCropGuideToTelegram.
    throw new Error(
      "recordPublication is not available on BFF remote path; use publishCropGuideToTelegram",
    );
  }
}
