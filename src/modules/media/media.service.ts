import { Injectable } from "@nestjs/common";
import type { MediaListParams, MediaUploadParams } from "./media.types";

export type { MediaListParams, MediaUploadParams } from "./media.types";

/** DI token; runtime: {@link MediaRemoteService} (ADR-0018 cutover). */
@Injectable()
export abstract class MediaService {
  abstract uploadPublicImage(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType?: string;
    size?: number;
    width?: number | null;
    height?: number | null;
    cropOptions?: MediaUploadParams["cropOptions"];
    resizeOptions?: MediaUploadParams["resizeOptions"];
    generateThumbnail?: boolean;
  }): Promise<unknown>;

  abstract uploadMediaWithFolder(params: MediaUploadParams): Promise<unknown>;

  abstract getMediaList(params?: MediaListParams): Promise<{
    media: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;

  abstract getMediaById(id: string): Promise<unknown | null>;

  abstract deleteMedia(id: string): Promise<unknown>;

  abstract updateMediaMetadata(
    id: string,
    metadata: Partial<{ width: number; height: number }>,
  ): Promise<unknown>;

  abstract getMediaStats(): Promise<unknown>;

  abstract getImageInfo(fileBuffer: Buffer): Promise<unknown>;

  abstract validateImage(
    fileBuffer: Buffer,
    mimeType?: string,
  ): Promise<unknown>;

  abstract findManyByIds(
    ids: string[],
  ): Promise<Array<{ id: string; url: string }>>;
}
