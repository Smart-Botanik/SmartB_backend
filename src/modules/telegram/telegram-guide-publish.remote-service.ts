import { Injectable } from "@nestjs/common";
import { ContentRemoteGraphqlClient } from "../content/content-remote.graphql-client";
import { MUTATION_PUBLISH_CROP_GUIDE_TO_TELEGRAM } from "./telegram-remote.operations";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";

/**
 * BFF proxy for publishCropGuideToTelegram → content-service (owns Bot API + DB).
 */
@Injectable()
export class TelegramGuidePublishRemoteService extends TelegramGuidePublishService {
  constructor(private readonly remote: ContentRemoteGraphqlClient) {
    super();
  }

  async publishCropGuide(cropGuideId: string, channelId?: string | null) {
    const data = await this.remote.execute<{
      publishCropGuideToTelegram: unknown;
    }>(MUTATION_PUBLISH_CROP_GUIDE_TO_TELEGRAM, {
      id: cropGuideId,
      channelId: channelId ?? undefined,
    });
    return data.publishCropGuideToTelegram;
  }
}
