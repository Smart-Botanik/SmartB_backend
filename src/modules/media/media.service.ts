import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { LocalStorageService } from "../../infrastructure/storage/local-storage.service";
import {
  ImageProcessingService,
  CropOptions,
  ResizeOptions,
} from "../../infrastructure/image-processing/image-processing.service";

export interface MediaUploadParams {
  fileBuffer: Buffer;
  originalName: string;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  folder?: string;
  entityType?: "brand" | "product" | "general";
  entityId?: string;
  cropOptions?: CropOptions;
  resizeOptions?: { width?: number; height?: number; fit?: string };
  generateThumbnail?: boolean;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  folder?: string;
  entityType?: string;
  search?: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly configService: ConfigService,
  ) {}

  async uploadPublicImage(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType?: string;
    size?: number;
    width?: number | null;
    height?: number | null;
    cropOptions?: CropOptions;
    resizeOptions?: { width?: number; height?: number; fit?: string };
    generateThumbnail?: boolean;
  }) {
    // Process image if needed
    let processedBuffer = params.fileBuffer;
    let finalWidth = params.width;
    let finalHeight = params.height;
    let finalSize = params.size;

    if (params.cropOptions || params.resizeOptions) {
      // Convert flexible resize options to strict ResizeOptions
      const strictResizeOptions: ResizeOptions | undefined =
        params.resizeOptions
          ? {
              width: params.resizeOptions.width,
              height: params.resizeOptions.height,
              fit: params.resizeOptions.fit as ResizeOptions["fit"],
            }
          : undefined;

      const processed = await this.imageProcessingService.cropImage(
        params.fileBuffer,
        params.cropOptions || {
          x: 0,
          y: 0,
          width: params.width || 100,
          height: params.height || 100,
        },
        strictResizeOptions,
      );
      processedBuffer = processed.buffer;
      finalWidth = processed.width;
      finalHeight = processed.height;
      finalSize = processed.size;
    }

    // Upload main image
    const uploaded = await this.localStorageService.uploadFile({
      fileBuffer: processedBuffer,
      originalName: params.originalName,
      mimeType: params.mimeType,
      folder: "general",
    });

    // Generate thumbnail if requested
    let thumbnailUrl: string | null = null;
    if (params.generateThumbnail && params.mimeType?.startsWith("image/")) {
      try {
        const thumbnail = await this.imageProcessingService.generateThumbnail(
          params.fileBuffer,
        );
        const thumbnailUpload = await this.localStorageService.uploadFile({
          fileBuffer: thumbnail.buffer,
          originalName: `thumb_${params.originalName}`,
          mimeType: "image/jpeg",
          folder: "general/thumbnails",
        });
        thumbnailUrl = thumbnailUpload.url;
      } catch (error) {
        console.error("Failed to generate thumbnail:", error);
      }
    }

    const media = await this.prisma.media.create({
      data: {
        provider: "local",
        bucket: "uploads",
        key: uploaded.path,
        url: uploaded.url,
        mime: params.mimeType,
        size: finalSize || uploaded.size,
        width: finalWidth,
        height: finalHeight,
      },
    });

    return media;
  }

  async uploadMediaWithFolder(params: MediaUploadParams) {
    // Process image if needed
    let processedBuffer = params.fileBuffer;
    let finalWidth = params.width;
    let finalHeight = params.height;
    let finalSize = params.size;

    if (params.cropOptions || params.resizeOptions) {
      // Convert flexible resize options to strict ResizeOptions
      const strictResizeOptions: ResizeOptions | undefined =
        params.resizeOptions
          ? {
              width: params.resizeOptions.width,
              height: params.resizeOptions.height,
              fit: params.resizeOptions.fit as ResizeOptions["fit"],
            }
          : undefined;

      const processed = await this.imageProcessingService.cropImage(
        params.fileBuffer,
        params.cropOptions || {
          x: 0,
          y: 0,
          width: params.width || 100,
          height: params.height || 100,
        },
        strictResizeOptions,
      );
      processedBuffer = processed.buffer;
      finalWidth = processed.width;
      finalHeight = processed.height;
      finalSize = processed.size;
    }

    const folder = this.generateFolderPath(params);

    // Upload main image
    const uploaded = await this.localStorageService.uploadFile({
      fileBuffer: processedBuffer,
      originalName: params.originalName,
      mimeType: params.mimeType,
      folder: folder,
    });

    // Generate thumbnail if requested
    let thumbnailUrl: string | null = null;
    if (params.generateThumbnail && params.mimeType?.startsWith("image/")) {
      try {
        const thumbnail = await this.imageProcessingService.generateThumbnail(
          params.fileBuffer,
        );
        const thumbnailUpload = await this.localStorageService.uploadFile({
          fileBuffer: thumbnail.buffer,
          originalName: `thumb_${params.originalName}`,
          mimeType: "image/jpeg",
          folder: `${folder}/thumbnails`,
        });
        thumbnailUrl = thumbnailUpload.url;
      } catch (error) {
        console.error("Failed to generate thumbnail:", error);
      }
    }

    const media = await this.prisma.media.create({
      data: {
        provider: "local",
        bucket: "uploads",
        key: uploaded.path,
        url: uploaded.url,
        mime: params.mimeType,
        size: finalSize || uploaded.size,
        width: finalWidth,
        height: finalHeight,
      },
    });

    return media;
  }

  private generateFolderPath(params: MediaUploadParams): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    if (params.entityType && params.entityId) {
      return `${params.entityType}s/${params.entityId}/${params.folder || "gallery"}`;
    }

    if (params.entityType) {
      return `${params.entityType}s/${params.folder || "general"}`;
    }

    if (params.folder) {
      return `${params.folder}/${year}/${month}`;
    }

    return `general/${year}/${month}`;
  }

  async getMediaList(params: MediaListParams = {}) {
    const { page = 1, limit = 20, folder, entityType, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { key: { contains: search, mode: "insensitive" } },
          { url: { contains: search, mode: "insensitive" } },
          { mime: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (folder) {
      const normalized = folder.replace(/^\/+/u, "").replace(/\/+$/u, "");
      if (normalized.length > 0) {
        // Keys in DB are relative paths (e.g. `brands/2026/04/file.png`), not `uploads/...`.
        and.push({
          OR: [
            { key: { startsWith: `${normalized}/` } },
            { key: { startsWith: `uploads/${normalized}/` } },
          ],
        });
      }
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getMediaById(id: string) {
    return this.prisma.media.findUnique({
      where: { id },
    });
  }

  async deleteMedia(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    // Delete from local storage
    try {
      await this.localStorageService.deleteFile(media.key);
    } catch (error) {
      console.error("Failed to delete from local storage:", error);
    }

    // Delete from database
    return this.prisma.media.delete({
      where: { id },
    });
  }

  async updateMediaMetadata(
    id: string,
    metadata: Partial<{
      width: number;
      height: number;
    }>,
  ) {
    return this.prisma.media.update({
      where: { id },
      data: metadata,
    });
  }

  async getMediaStats() {
    const total = await this.prisma.media.count();
    const totalSize = await this.prisma.media.aggregate({
      _sum: { size: true },
    });

    const byType = await this.prisma.media.groupBy({
      by: ["mime"],
      _count: { mime: true },
      _sum: { size: true },
    });

    const byProvider = await this.prisma.media.groupBy({
      by: ["provider"],
      _count: { provider: true },
    });

    return {
      total,
      totalSize: totalSize._sum.size || 0,
      byType: byType.map((item) => ({
        type: item.mime,
        count: item._count.mime,
        size: item._sum.size || 0,
      })),
      byProvider: byProvider.map((item) => ({
        provider: item.provider,
        count: item._count.provider,
      })),
    };
  }

  async getImageInfo(fileBuffer: Buffer) {
    return this.imageProcessingService.getImageInfo(fileBuffer);
  }

  async validateImage(fileBuffer: Buffer, mimeType?: string) {
    // Check MIME type
    if (mimeType && !mimeType.startsWith("image/")) {
      throw new Error("File is not an image");
    }

    // Validate image format
    const isValidFormat =
      await this.imageProcessingService.validateImageFormat(fileBuffer);
    if (!isValidFormat) {
      throw new Error("Unsupported image format");
    }

    // Get image info
    const imageInfo =
      await this.imageProcessingService.getImageInfo(fileBuffer);

    return {
      isValid: true,
      width: imageInfo.width,
      height: imageInfo.height,
      format: imageInfo.format,
      size: imageInfo.size,
      hasAlpha: imageInfo.hasAlpha,
    };
  }
}
