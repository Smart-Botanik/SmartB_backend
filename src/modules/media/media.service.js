"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const local_storage_service_1 = require("../../infrastructure/storage/local-storage.service");
const image_processing_service_1 = require("../../infrastructure/image-processing/image-processing.service");
let MediaService = class MediaService {
    constructor(prisma, localStorageService, imageProcessingService, configService) {
        this.prisma = prisma;
        this.localStorageService = localStorageService;
        this.imageProcessingService = imageProcessingService;
        this.configService = configService;
    }
    async uploadPublicImage(params) {
        let processedBuffer = params.fileBuffer;
        let finalWidth = params.width;
        let finalHeight = params.height;
        let finalSize = params.size;
        if (params.cropOptions || params.resizeOptions) {
            const strictResizeOptions = params.resizeOptions
                ? {
                    width: params.resizeOptions.width,
                    height: params.resizeOptions.height,
                    fit: params.resizeOptions.fit,
                }
                : undefined;
            const processed = await this.imageProcessingService.cropImage(params.fileBuffer, params.cropOptions || {
                x: 0,
                y: 0,
                width: params.width || 100,
                height: params.height || 100,
            }, strictResizeOptions);
            processedBuffer = processed.buffer;
            finalWidth = processed.width;
            finalHeight = processed.height;
            finalSize = processed.size;
        }
        const uploaded = await this.localStorageService.uploadFile({
            fileBuffer: processedBuffer,
            originalName: params.originalName,
            mimeType: params.mimeType,
            folder: "general",
        });
        let thumbnailUrl = null;
        if (params.generateThumbnail && params.mimeType?.startsWith("image/")) {
            try {
                const thumbnail = await this.imageProcessingService.generateThumbnail(params.fileBuffer);
                const thumbnailUpload = await this.localStorageService.uploadFile({
                    fileBuffer: thumbnail.buffer,
                    originalName: `thumb_${params.originalName}`,
                    mimeType: "image/jpeg",
                    folder: "general/thumbnails",
                });
                thumbnailUrl = thumbnailUpload.url;
            }
            catch (error) {
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
    async uploadMediaWithFolder(params) {
        let processedBuffer = params.fileBuffer;
        let finalWidth = params.width;
        let finalHeight = params.height;
        let finalSize = params.size;
        if (params.cropOptions || params.resizeOptions) {
            const strictResizeOptions = params.resizeOptions
                ? {
                    width: params.resizeOptions.width,
                    height: params.resizeOptions.height,
                    fit: params.resizeOptions.fit,
                }
                : undefined;
            const processed = await this.imageProcessingService.cropImage(params.fileBuffer, params.cropOptions || {
                x: 0,
                y: 0,
                width: params.width || 100,
                height: params.height || 100,
            }, strictResizeOptions);
            processedBuffer = processed.buffer;
            finalWidth = processed.width;
            finalHeight = processed.height;
            finalSize = processed.size;
        }
        const folder = this.generateFolderPath(params);
        const uploaded = await this.localStorageService.uploadFile({
            fileBuffer: processedBuffer,
            originalName: params.originalName,
            mimeType: params.mimeType,
            folder: folder,
        });
        let thumbnailUrl = null;
        if (params.generateThumbnail && params.mimeType?.startsWith("image/")) {
            try {
                const thumbnail = await this.imageProcessingService.generateThumbnail(params.fileBuffer);
                const thumbnailUpload = await this.localStorageService.uploadFile({
                    fileBuffer: thumbnail.buffer,
                    originalName: `thumb_${params.originalName}`,
                    mimeType: "image/jpeg",
                    folder: `${folder}/thumbnails`,
                });
                thumbnailUrl = thumbnailUpload.url;
            }
            catch (error) {
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
    generateFolderPath(params) {
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
    async getMediaList(params = {}) {
        const { page = 1, limit = 20, folder, entityType, search } = params;
        const skip = (page - 1) * limit;
        const where = {};
        const and = [];
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
    async getMediaById(id) {
        return this.prisma.media.findUnique({
            where: { id },
        });
    }
    async deleteMedia(id) {
        const media = await this.prisma.media.findUnique({
            where: { id },
        });
        if (!media) {
            throw new Error("Media not found");
        }
        try {
            await this.localStorageService.deleteFile(media.key);
        }
        catch (error) {
            console.error("Failed to delete from local storage:", error);
        }
        return this.prisma.media.delete({
            where: { id },
        });
    }
    async updateMediaMetadata(id, metadata) {
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
    async getImageInfo(fileBuffer) {
        return this.imageProcessingService.getImageInfo(fileBuffer);
    }
    async validateImage(fileBuffer, mimeType) {
        if (mimeType && !mimeType.startsWith("image/")) {
            throw new Error("File is not an image");
        }
        const isValidFormat = await this.imageProcessingService.validateImageFormat(fileBuffer);
        if (!isValidFormat) {
            throw new Error("Unsupported image format");
        }
        const imageInfo = await this.imageProcessingService.getImageInfo(fileBuffer);
        return {
            isValid: true,
            width: imageInfo.width,
            height: imageInfo.height,
            format: imageInfo.format,
            size: imageInfo.size,
            hasAlpha: imageInfo.hasAlpha,
        };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        local_storage_service_1.LocalStorageService,
        image_processing_service_1.ImageProcessingService,
        config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map