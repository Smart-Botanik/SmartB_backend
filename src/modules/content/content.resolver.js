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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitePageResolver = exports.CropGuideResolver = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const contracts_1 = require("@growing/contracts");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const gql_jwt_auth_guard_1 = require("../auth/guards/gql-jwt-auth.guard");
const gql_roles_guard_1 = require("../auth/guards/gql-roles.guard");
const content_service_1 = require("./content.service");
let CropGuideResolver = class CropGuideResolver {
    constructor(contentService, prisma) {
        this.contentService = contentService;
        this.prisma = prisma;
    }
    async cover(guide) {
        if (guide.coverMedia)
            return guide.coverMedia;
        if (!guide.coverMediaId)
            return null;
        return this.prisma.media.findUnique({ where: { id: guide.coverMediaId } });
    }
    coverMediaId(guide) {
        return guide.coverMediaId ?? guide.coverMedia?.id ?? null;
    }
    async bodySiteMdResolved(guide) {
        return this.contentService.resolveMediaInMarkdown(guide.bodySiteMd ?? "");
    }
    taxonomyTags(guide) {
        if (guide.taxonomyTags)
            return guide.taxonomyTags;
        return this.contentService.resolveCropGuideTaxonomyTags(guide.id);
    }
    cropGuides(limit, offset, cropKind, status, query, termKey) {
        return this.contentService.listCropGuides({
            limit,
            offset,
            cropKind,
            status,
            query,
            termKey,
        });
    }
    cropGuide(id) {
        return this.contentService.getCropGuideById(id);
    }
    cropGuideBySlug(slug) {
        return this.contentService.getCropGuideBySlug(slug);
    }
    publishedCropGuides(cropKind, termKey) {
        return this.contentService.listPublishedCropGuides(cropKind, termKey);
    }
    publishedCropGuide(slug) {
        return this.contentService.getPublishedCropGuideBySlug(slug);
    }
    createCropGuide(input) {
        return this.contentService.createCropGuide(input);
    }
    updateCropGuide(id, input) {
        return this.contentService.updateCropGuide({ id, ...input });
    }
    deleteCropGuide(id) {
        return this.contentService.deleteCropGuide(id);
    }
    publishCropGuide(id) {
        return this.contentService.publishCropGuide(id);
    }
    unpublishCropGuide(id) {
        return this.contentService.unpublishCropGuide(id);
    }
};
exports.CropGuideResolver = CropGuideResolver;
__decorate([
    (0, graphql_1.ResolveField)("cover"),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CropGuideResolver.prototype, "cover", null);
__decorate([
    (0, graphql_1.ResolveField)("coverMediaId"),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "coverMediaId", null);
__decorate([
    (0, graphql_1.ResolveField)("bodySiteMdResolved"),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CropGuideResolver.prototype, "bodySiteMdResolved", null);
__decorate([
    (0, graphql_1.ResolveField)("taxonomyTags"),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "taxonomyTags", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Query)("cropGuides"),
    __param(0, (0, graphql_1.Args)("limit", { nullable: true })),
    __param(1, (0, graphql_1.Args)("offset", { nullable: true })),
    __param(2, (0, graphql_1.Args)("cropKind", { nullable: true })),
    __param(3, (0, graphql_1.Args)("status", { nullable: true })),
    __param(4, (0, graphql_1.Args)("query", { nullable: true })),
    __param(5, (0, graphql_1.Args)("termKey", { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "cropGuides", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Query)("cropGuide"),
    __param(0, (0, graphql_1.Args)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "cropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Query)("cropGuideBySlug"),
    __param(0, (0, graphql_1.Args)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "cropGuideBySlug", null);
__decorate([
    (0, graphql_1.Query)("publishedCropGuides"),
    __param(0, (0, graphql_1.Args)("cropKind", { nullable: true })),
    __param(1, (0, graphql_1.Args)("termKey", { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "publishedCropGuides", null);
__decorate([
    (0, graphql_1.Query)("publishedCropGuide"),
    __param(0, (0, graphql_1.Args)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "publishedCropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("createCropGuide"),
    __param(0, (0, graphql_1.Args)("input")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "createCropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("updateCropGuide"),
    __param(0, (0, graphql_1.Args)("id")),
    __param(1, (0, graphql_1.Args)("input")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "updateCropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("deleteCropGuide"),
    __param(0, (0, graphql_1.Args)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "deleteCropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("publishCropGuide"),
    __param(0, (0, graphql_1.Args)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "publishCropGuide", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("unpublishCropGuide"),
    __param(0, (0, graphql_1.Args)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CropGuideResolver.prototype, "unpublishCropGuide", null);
exports.CropGuideResolver = CropGuideResolver = __decorate([
    (0, graphql_1.Resolver)("CropGuide"),
    __metadata("design:paramtypes", [content_service_1.ContentService,
        prisma_service_1.PrismaService])
], CropGuideResolver);
let SitePageResolver = class SitePageResolver {
    constructor(contentService) {
        this.contentService = contentService;
    }
    sitePages(status) {
        return this.contentService.listSitePages(status);
    }
    sitePage(key) {
        return this.contentService.getSitePageByKey(key);
    }
    publishedSitePage(key) {
        return this.contentService.getPublishedSitePageByKey(key);
    }
    upsertSitePage(input) {
        return this.contentService.upsertSitePage(input);
    }
    publishSitePage(key) {
        return this.contentService.publishSitePage(key);
    }
    unpublishSitePage(key) {
        return this.contentService.unpublishSitePage(key);
    }
};
exports.SitePageResolver = SitePageResolver;
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Query)("sitePages"),
    __param(0, (0, graphql_1.Args)("status", { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "sitePages", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Query)("sitePage"),
    __param(0, (0, graphql_1.Args)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "sitePage", null);
__decorate([
    (0, graphql_1.Query)("publishedSitePage"),
    __param(0, (0, graphql_1.Args)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "publishedSitePage", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("upsertSitePage"),
    __param(0, (0, graphql_1.Args)("input")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "upsertSitePage", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("publishSitePage"),
    __param(0, (0, graphql_1.Args)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "publishSitePage", null);
__decorate([
    (0, common_1.UseGuards)(gql_jwt_auth_guard_1.GqlJwtAuthGuard, gql_roles_guard_1.GqlRolesGuard),
    (0, roles_decorator_1.Roles)(contracts_1.Role.ADMIN),
    (0, graphql_1.Mutation)("unpublishSitePage"),
    __param(0, (0, graphql_1.Args)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SitePageResolver.prototype, "unpublishSitePage", null);
exports.SitePageResolver = SitePageResolver = __decorate([
    (0, graphql_1.Resolver)("SitePage"),
    __metadata("design:paramtypes", [content_service_1.ContentService])
], SitePageResolver);
//# sourceMappingURL=content.resolver.js.map