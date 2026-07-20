import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  RequestMethod,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MediaController } from "./media.controller";
import { MediaRemoteHttpClient } from "./media-remote.http-client";
import { MediaRemoteService } from "./media.remote-service";
import { MediaService } from "./media.service";
import { MediaUploadsProxyMiddleware } from "./media-uploads-proxy.middleware";

/**
 * Bounded context: Media — remote-only after ADR-0018 cutover.
 */
@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [
    MediaRemoteHttpClient,
    MediaRemoteService,
    { provide: MediaService, useClass: MediaRemoteService },
    MediaUploadsProxyMiddleware,
  ],
  exports: [MediaService, MediaRemoteService, MediaRemoteHttpClient],
})
export class MediaModule implements NestModule, OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("MEDIA_SERVICE_URL")?.trim();
    const cutover =
      this.config.get<string>("MEDIA_CUTOVER")?.trim() !== "false";
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "MEDIA_CUTOVER requires MEDIA_SERVICE_URL (media-service)",
      );
    }
  }

  configure(consumer: MiddlewareConsumer) {
    // Express 4 path-to-regexp: use `uploads/*` (splat). Nest-style `uploads/(.*)`
    // does not match nested keys like /uploads/generals/.../file.jpg → client 404.
    consumer
      .apply(MediaUploadsProxyMiddleware)
      .forRoutes(
        { path: "uploads/*", method: RequestMethod.GET },
        { path: "uploads/*", method: RequestMethod.HEAD },
      );
  }
}
