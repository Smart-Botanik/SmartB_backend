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
import {
  MediaService,
  MediaUploadParams,
  MediaListParams,
} from "./media.service";
import {
  CropOptions,
  ResizeOptions,
} from "../../infrastructure/image-processing/image-processing.service";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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
    @UploadedFile() file: Express.Multer.File,
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
    @UploadedFile() file: Express.Multer.File,
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
    @UploadedFile() file: Express.Multer.File,
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
  async getImageInfo(@UploadedFile() file: Express.Multer.File) {
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
    @UploadedFile() file: Express.Multer.File,
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
    @UploadedFile() file: Express.Multer.File,
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
    @Body() body: { width?: number; height?: number },
  ) {
    return this.mediaService.updateMediaMetadata(id, body);
  }
}
