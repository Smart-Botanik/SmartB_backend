import {
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

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string; entityType?: string; entityId?: string },
  ) {
    if (!file) {
      throw new Error("Missing file");
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
      throw new Error("Missing file");
    }

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
      cropOptions: body.cropOptions,
      resizeOptions: body.resizeOptions,
      generateThumbnail: body.generateThumbnail,
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
      throw new Error("Missing file");
    }

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: "cropped",
      cropOptions: body.cropOptions,
      resizeOptions: body.resizeOptions,
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
      throw new Error("Missing file");
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
      throw new Error("Missing file");
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
      throw new Error("Missing file");
    }

    const media = await this.mediaService.uploadMediaWithFolder({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: body.folder,
      entityType: body.entityType as any,
      entityId: body.entityId,
      cropOptions: body.cropOptions,
      resizeOptions: body.resizeOptions,
      generateThumbnail: body.generateThumbnail,
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

  @Get("admin/media/stats")
  async adminStats() {
    return this.mediaService.getMediaStats();
  }
}
