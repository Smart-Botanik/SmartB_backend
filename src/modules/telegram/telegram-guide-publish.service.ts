import { Injectable } from "@nestjs/common";

/** DI token; runtime: {@link TelegramGuidePublishRemoteService}. */
@Injectable()
export abstract class TelegramGuidePublishService {
  abstract publishCropGuide(
    cropGuideId: string,
    channelId?: string | null,
  ): Promise<unknown>;
}
