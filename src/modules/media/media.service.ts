import { Injectable } from "@nestjs/common";
import type {
  MediaListParams,
  MediaListResult,
  MediaRecord,
  MediaStats,
  MediaUploadParams,
} from "./media.types";

export type {
  MediaListParams,
  MediaListResult,
  MediaRecord,
  MediaStats,
  MediaUploadParams,
} from "./media.types";

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
  }): Promise<MediaRecord>;

  abstract uploadMediaWithFolder(params: MediaUploadParams): Promise<MediaRecord>;

  abstract getMediaList(params?: MediaListParams): Promise<MediaListResult>;

  abstract getMediaById(id: string): Promise<MediaRecord | null>;

  abstract deleteMedia(id: string): Promise<MediaRecord>;

  abstract updateMediaMetadata(
    id: string,
    metadata: Partial<{ width: number; height: number }>,
  ): Promise<MediaRecord>;

  abstract getMediaStats(): Promise<MediaStats>;

  abstract getImageInfo(fileBuffer: Buffer): Promise<Record<string, unknown>>;

  abstract validateImage(
    fileBuffer: Buffer,
    mimeType?: string,
  ): Promise<Record<string, unknown>>;

  abstract findManyByIds(ids: string[]): Promise<MediaRecord[]>;
}
