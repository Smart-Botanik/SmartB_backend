import { Injectable } from "@nestjs/common";
import { MediaRemoteHttpClient } from "./media-remote.http-client";
import type {
  MediaListParams,
  MediaListResult,
  MediaRecord,
  MediaStats,
  MediaUploadParams,
} from "./media.types";
import { MediaService } from "./media.service";

/**
 * BFF proxy to media-service (ADR-0018 / BK-MS-MEDIA-2 hard cutover).
 */
@Injectable()
export class MediaRemoteService extends MediaService {
  constructor(private readonly http: MediaRemoteHttpClient) {
    super();
  }

  private toFormData(params: MediaUploadParams): FormData {
    const form = new FormData();
    const bytes = new Uint8Array(params.fileBuffer);
    const blob = new Blob([bytes], {
      type: params.mimeType || "application/octet-stream",
    });
    form.append("file", blob, params.originalName);
    if (params.folder) form.append("folder", params.folder);
    if (params.entityType) form.append("entityType", params.entityType);
    if (params.entityId) form.append("entityId", params.entityId);
    if (params.cropOptions) {
      form.append("cropOptions", JSON.stringify(params.cropOptions));
    }
    if (params.resizeOptions) {
      form.append("resizeOptions", JSON.stringify(params.resizeOptions));
    }
    if (params.generateThumbnail !== undefined) {
      form.append("generateThumbnail", String(params.generateThumbnail));
    }
    return form;
  }

  async uploadPublicImage(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType?: string;
    size?: number;
    width?: number | null;
    height?: number | null;
    cropOptions?: MediaUploadParams["cropOptions"];
    resizeOptions?: MediaUploadParams["resizeOptions"];
    generateThumbnail?: boolean;
  }): Promise<MediaRecord> {
    const path =
      params.cropOptions || params.resizeOptions
        ? "/media/upload-with-crop"
        : "/media/upload";
    return this.http.requestJson<MediaRecord>("POST", path, {
      body: this.toFormData({
        ...params,
        entityType: "general",
      }),
    });
  }

  async uploadMediaWithFolder(params: MediaUploadParams): Promise<MediaRecord> {
    const path =
      params.cropOptions || params.resizeOptions || params.generateThumbnail
        ? "/media/admin/media/upload-with-crop"
        : "/media/admin/media/upload";
    return this.http.requestJson<MediaRecord>("POST", path, {
      body: this.toFormData(params),
    });
  }

  async getMediaList(params: MediaListParams = {}): Promise<MediaListResult> {
    const q = new URLSearchParams();
    if (params.page != null) q.set("page", String(params.page));
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.folder) q.set("folder", params.folder);
    if (params.entityType) q.set("entityType", params.entityType);
    if (params.search) q.set("search", params.search);
    const qs = q.toString();
    return this.http.requestJson<MediaListResult>(
      "GET",
      `/media/admin/media${qs ? `?${qs}` : ""}`,
    );
  }

  async getMediaById(id: string): Promise<MediaRecord | null> {
    try {
      return await this.http.requestJson<MediaRecord>(
        "GET",
        `/media/admin/media/${encodeURIComponent(id)}`,
      );
    } catch {
      return null;
    }
  }

  async deleteMedia(id: string): Promise<MediaRecord> {
    return this.http.requestJson<MediaRecord>(
      "DELETE",
      `/media/admin/media/${encodeURIComponent(id)}`,
    );
  }

  async updateMediaMetadata(
    id: string,
    metadata: Partial<{
      width: number;
      height: number;
      kind: "IMAGE" | "VIDEO";
      posterMediaId: string | null;
    }>,
  ): Promise<MediaRecord> {
    return this.http.requestJson<MediaRecord>(
      "PUT",
      `/media/admin/media/${encodeURIComponent(id)}`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      },
    );
  }

  async getMediaStats(): Promise<MediaStats> {
    return this.http.requestJson<MediaStats>("GET", "/media/admin/media/stats");
  }

  async getImageInfo(fileBuffer: Buffer) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(fileBuffer)]),
      "image.bin",
    );
    return this.http.requestJson<Record<string, unknown>>(
      "POST",
      "/media/get-image-info",
      { body: form },
    );
  }

  async validateImage(fileBuffer: Buffer, mimeType?: string) {
    const info = await this.getImageInfo(fileBuffer);
    const validation = (info as { validation?: Record<string, unknown> })
      .validation;
    if (validation) return validation;
    if (mimeType && !mimeType.startsWith("image/")) {
      throw new Error("File is not an image");
    }
    return { isValid: true, ...info };
  }

  async findManyByIds(ids: string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) return [];
    const results = await Promise.all(ids.map((id) => this.getMediaById(id)));
    return results.filter((m): m is MediaRecord => Boolean(m?.id && m?.url));
  }
}
