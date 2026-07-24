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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const media_service_1 = require("./media.service");
let MediaController = class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    parseJsonField(raw, fieldName) {
        if (raw === undefined || raw === null || raw === "") {
            return undefined;
        }
        if (typeof raw === "object") {
            return raw;
        }
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw);
            }
            catch {
                throw new common_1.BadRequestException(`Invalid JSON in field: ${fieldName}`);
            }
        }
        throw new common_1.BadRequestException(`Invalid type for field: ${fieldName}`);
    }
    parseBool(raw) {
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
    async upload(file, body) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const media = await this.mediaService.uploadMediaWithFolder({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folder: body.folder,
            entityType: body.entityType,
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
    async uploadWithCrop(file, body) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const cropOptions = this.parseJsonField(body.cropOptions, "cropOptions");
        const resizeOptions = this.parseJsonField(body.resizeOptions, "resizeOptions");
        const generateThumbnail = this.parseBool(body.generateThumbnail);
        const media = await this.mediaService.uploadMediaWithFolder({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folder: body.folder,
            entityType: body.entityType,
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
    async cropImage(file, body) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const cropOptions = this.parseJsonField(body.cropOptions, "cropOptions");
        if (!cropOptions) {
            throw new common_1.BadRequestException("cropOptions is required");
        }
        const resizeOptions = this.parseJsonField(body.resizeOptions, "resizeOptions");
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
    async getImageInfo(file) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const info = await this.mediaService.getImageInfo(file.buffer);
        const validation = await this.mediaService.validateImage(file.buffer, file.mimetype);
        return {
            ...info,
            validation,
        };
    }
    async adminUpload(file, body) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const media = await this.mediaService.uploadMediaWithFolder({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folder: body.folder,
            entityType: body.entityType,
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
    async adminUploadWithCrop(file, body) {
        if (!file) {
            throw new common_1.BadRequestException("Missing file");
        }
        const cropOptions = this.parseJsonField(body.cropOptions, "cropOptions");
        const resizeOptions = this.parseJsonField(body.resizeOptions, "resizeOptions");
        const generateThumbnail = this.parseBool(body.generateThumbnail);
        const media = await this.mediaService.uploadMediaWithFolder({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folder: body.folder,
            entityType: body.entityType,
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
    async adminList(query) {
        return this.mediaService.getMediaList(query);
    }
    async adminStats() {
        return this.mediaService.getMediaStats();
    }
    async adminGetById(id) {
        return this.mediaService.getMediaById(id);
    }
    async adminDelete(id) {
        return this.mediaService.deleteMedia(id);
    }
    async adminUpdate(id, body) {
        return this.mediaService.updateMediaMetadata(id, body);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)("upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof Express !== "undefined" && (_a = Express.Multer) !== void 0 && _a.File) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)("upload-with-crop"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof Express !== "undefined" && (_c = Express.Multer) !== void 0 && _c.File) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadWithCrop", null);
__decorate([
    (0, common_1.Post)("crop-image"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof Express !== "undefined" && (_e = Express.Multer) !== void 0 && _e.File) === "function" ? _f : Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "cropImage", null);
__decorate([
    (0, common_1.Post)("get-image-info"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof Express !== "undefined" && (_g = Express.Multer) !== void 0 && _g.File) === "function" ? _h : Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getImageInfo", null);
__decorate([
    (0, common_1.Post)("admin/media/upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof Express !== "undefined" && (_j = Express.Multer) !== void 0 && _j.File) === "function" ? _k : Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminUpload", null);
__decorate([
    (0, common_1.Post)("admin/media/upload-with-crop"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_m = typeof Express !== "undefined" && (_l = Express.Multer) !== void 0 && _l.File) === "function" ? _m : Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminUploadWithCrop", null);
__decorate([
    (0, common_1.Get)("admin/media"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminList", null);
__decorate([
    (0, common_1.Get)("admin/media/stats"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminStats", null);
__decorate([
    (0, common_1.Get)("admin/media/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminGetById", null);
__decorate([
    (0, common_1.Delete)("admin/media/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminDelete", null);
__decorate([
    (0, common_1.Put)("admin/media/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "adminUpdate", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)("media"),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map