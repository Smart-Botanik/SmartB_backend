import {
  BadRequestException,
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Delete,
  Param,
  Put,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaRemoteHttpClient } from "./media-remote.http-client";
import { MediaService } from "./media.service";
import type { MediaListParams } from "./media.types";

/** Local upload file shape (TS7: UploadedFilePayload ambient merge is unreliable). */
type UploadedFilePayload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaHttp: MediaRemoteHttpClient,
  ) {}

  private parseJsonField<T>(raw: unknown, fieldName: string): T | undefined {
    if (raw === undefined || raw === null || raw === "") {
      return undefined;
    }
    if (typeof raw === "object") {
      return raw as T;
    }
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        throw new BadRequestException(`Invalid JSON in field: ${fieldName}`);
      }
    }
    throw new BadRequestException(`Invalid type for field: ${fieldName}`);
  }

  private parseBool(raw: unknown): boolean | undefined {
    if (raw === undefined || raw === null || raw === "") {
      return undefined;
    }
    if (typeof raw === "boolean") {
      return raw;
    }
    if (raw === "true" || raw === "1") {
      return true;
    }
    if (raw === "false" || raw === "0") {
      return false;
    }
    return undefined;
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: UploadedFilePayload,
    @Body() body: { folder?: string; entityType?: string; entityId?: string },
  ) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
    });

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      key: media.key,
      createdAt: media.createdAt,
    };
  }

  @Post("upload-with-crop")
  @UseInterceptors(FileInterceptor("file"))
  async uploadWithCrop(
    @UploadedFile() file: UploadedFilePayload,
    @Body()
    body: {
      folder?: string;
      entityType?: string;
      entityId?: string;
      cropOptions?: { x: number; y: number; width: number; height: number };
      resizeOptions?: { width?: number; height?: number; fit?: string };
      generateThumbnail?: boolean;
    },
  ) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const cropOptions = this.parseJsonField<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(body.cropOptions, "cropOptions");
    const resizeOptions = this.parseJsonField<{
      width?: number;
      height?: number;
      fit?: string;
    }>(body.resizeOptions, "resizeOptions");
    const generateThumbnail = this.parseBool(body.generateThumbnail);

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
      cropOptions,
      resizeOptions,
      generateThumbnail,
    });

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      key: media.key,
      createdAt: media.createdAt,
    };
  }

  @Post("crop-image")
  @UseInterceptors(FileInterceptor("file"))
  async cropImage(
    @UploadedFile() file: UploadedFilePayload,
    @Body()
    body: {
      cropOptions: { x: number; y: number; width: number; height: number };
      resizeOptions?: { width?: number; height?: number; fit?: string };
    },
  ) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const cropOptions = this.parseJsonField<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(body.cropOptions, "cropOptions");
    if (!cropOptions) {
      throw new BadRequestException("cropOptions is required");
    }
    const resizeOptions = this.parseJsonField<{
      width?: number;
      height?: number;
      fit?: string;
    }>(body.resizeOptions, "resizeOptions");

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: "cropped",
      cropOptions,
      resizeOptions,
    });

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      key: media.key,
      createdAt: media.createdAt,
    };
  }

  @Post("get-image-info")
  @UseInterceptors(FileInterceptor("file"))
  async getImageInfo(@UploadedFile() file: UploadedFilePayload) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const info = await this.mediaService.getImageInfo(file.buffer);
    const validation = await this.mediaService.validateImage(
      file.buffer,
      file.mimetype,
    );

    return {
      ...info,
      validation,
    };
  }

  // Admin-specific endpoints
  @Post("admin/media/upload")
  @UseInterceptors(FileInterceptor("file"))
  async adminUpload(
    @UploadedFile() file: UploadedFilePayload,
    @Body() body: { folder?: string; entityType?: string; entityId?: string },
  ) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
    });

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      key: media.key,
      createdAt: media.createdAt,
    };
  }

  @Post("admin/media/upload-with-crop")
  @UseInterceptors(FileInterceptor("file"))
  async adminUploadWithCrop(
    @UploadedFile() file: UploadedFilePayload,
    @Body()
    body: {
      folder?: string;
      entityType?: string;
      entityId?: string;
      cropOptions?: { x: number; y: number; width: number; height: number };
      resizeOptions?: { width?: number; height?: number; fit?: string };
      generateThumbnail?: boolean;
    },
  ) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    const cropOptions = this.parseJsonField<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(body.cropOptions, "cropOptions");
    const resizeOptions = this.parseJsonField<{
      width?: number;
      height?: number;
      fit?: string;
    }>(body.resizeOptions, "resizeOptions");
    const generateThumbnail = this.parseBool(body.generateThumbnail);

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
      cropOptions,
      resizeOptions,
      generateThumbnail,
    });

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      key: media.key,
      createdAt: media.createdAt,
    };
  }

  @Get("admin/media")
  async adminList(@Query() query: MediaListParams) {
    return this.mediaService.getMediaList(query);
  }

  /** Должен быть объявлен до `admin/media/:id`, иначе `stats` перехватывается как id. */
  @Get("admin/media/stats")
  async adminStats() {
    return this.mediaService.getMediaStats();
  }

  @Get("admin/media/:id")
  async adminGetById(@Param("id") id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Delete("admin/media/:id")
  async adminDelete(@Param("id") id: string) {
    return this.mediaService.deleteMedia(id);
  }

  @Put("admin/media/:id")
  async adminUpdate(
    @Param("id") id: string,
    @Body()
    body: {
      width?: number;
      height?: number;
      kind?: "IMAGE" | "VIDEO";
      posterMediaId?: string | null;
    },
  ) {
    return this.mediaService.updateMediaMetadata(id, body);
  }

  // --- Galleries / entries (ADR-0019) — proxy to media-service ---

  @Get("admin/galleries")
  adminListGalleries(@Query() query: Record<string, string>) {
    const q = new URLSearchParams(query).toString();
    return this.mediaHttp.requestJson(
      "GET",
      `/media/admin/galleries${q ? `?${q}` : ""}`,
    );
  }

  @Post("admin/galleries")
  adminCreateGallery(@Body() body: unknown) {
    return this.mediaHttp.requestJson("POST", "/media/admin/galleries", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  @Get("admin/galleries/:id")
  adminGetGallery(@Param("id") id: string) {
    return this.mediaHttp.requestJson(
      "GET",
      `/media/admin/galleries/${encodeURIComponent(id)}`,
    );
  }

  @Put("admin/galleries/:id")
  adminUpdateGallery(@Param("id") id: string, @Body() body: unknown) {
    return this.mediaHttp.requestJson(
      "PUT",
      `/media/admin/galleries/${encodeURIComponent(id)}`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
    );
  }

  @Delete("admin/galleries/:id")
  adminDeleteGallery(@Param("id") id: string) {
    return this.mediaHttp.requestJson(
      "DELETE",
      `/media/admin/galleries/${encodeURIComponent(id)}`,
    );
  }

  @Get("galleries/:id")
  getPublishedGallery(@Param("id") id: string) {
    return this.mediaHttp.requestJson(
      "GET",
      `/media/galleries/${encodeURIComponent(id)}`,
    );
  }

  @Get("admin/entries")
  adminListEntries(@Query() query: Record<string, string>) {
    const q = new URLSearchParams(query).toString();
    return this.mediaHttp.requestJson(
      "GET",
      `/media/admin/entries${q ? `?${q}` : ""}`,
    );
  }

  @Post("admin/entries")
  adminCreateEntry(@Body() body: unknown) {
    return this.mediaHttp.requestJson("POST", "/media/admin/entries", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  @Get("admin/entries/:id")
  adminGetEntry(@Param("id") id: string) {
    return this.mediaHttp.requestJson(
      "GET",
      `/media/admin/entries/${encodeURIComponent(id)}`,
    );
  }

  @Put("admin/entries/:id")
  adminUpdateEntry(@Param("id") id: string, @Body() body: unknown) {
    return this.mediaHttp.requestJson(
      "PUT",
      `/media/admin/entries/${encodeURIComponent(id)}`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
    );
  }

  @Delete("admin/entries/:id")
  adminDeleteEntry(@Param("id") id: string) {
    return this.mediaHttp.requestJson(
      "DELETE",
      `/media/admin/entries/${encodeURIComponent(id)}`,
    );
  }
}
