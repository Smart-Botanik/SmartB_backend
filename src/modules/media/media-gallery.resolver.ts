import { Args, Query, Resolver } from "@nestjs/graphql";
import { ConfigService } from "@nestjs/config";
import { ContentRemoteGraphqlClient } from "../content/content-remote.graphql-client";
import {
  QUERY_PUBLISHED_GALLERY,
  QUERY_PUBLISHED_USEFUL_GALLERIES,
} from "../content/content-remote.operations";
import { MediaRemoteHttpClient } from "./media-remote.http-client";

/**
 * Public gallery queries: prefer content-service bridge (ADR-0019),
 * fall back to media-service direct if content URL is unset.
 */
@Resolver("MediaGallery")
export class MediaGalleryResolver {
  constructor(
    private readonly contentRemote: ContentRemoteGraphqlClient,
    private readonly mediaHttp: MediaRemoteHttpClient,
    private readonly config: ConfigService,
  ) {}

  private useContentBridge(): boolean {
    const cutover =
      this.config.get<string>("CONTENT_CUTOVER")?.trim() !== "false";
    return cutover && this.contentRemote.isEnabled();
  }

  @Query("publishedGallery")
  async publishedGallery(@Args("id") id: string) {
    if (this.useContentBridge()) {
      const data = await this.contentRemote.execute<{
        publishedGallery: unknown;
      }>(QUERY_PUBLISHED_GALLERY, { id });
      return data.publishedGallery;
    }
    return this.mediaHttp.requestJson(
      "GET",
      `/media/galleries/${encodeURIComponent(id)}`,
    );
  }

  @Query("publishedUsefulGalleries")
  async publishedUsefulGalleries() {
    if (this.useContentBridge()) {
      const data = await this.contentRemote.execute<{
        publishedUsefulGalleries: unknown;
      }>(QUERY_PUBLISHED_USEFUL_GALLERIES);
      return data.publishedUsefulGalleries;
    }
    return {
      imageGalleryId: null,
      videoGalleryId: null,
      image: null,
      video: null,
    };
  }
}
