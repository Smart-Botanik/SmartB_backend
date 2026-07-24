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
exports.ContentRemoteService = void 0;
const common_1 = require("@nestjs/common");
const content_markdown_1 = require("@growing/content-markdown");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const content_remote_graphql_client_1 = require("./content-remote.graphql-client");
const content_remote_operations_1 = require("./content-remote.operations");
const content_service_1 = require("./content.service");
let ContentRemoteService = class ContentRemoteService extends content_service_1.ContentService {
    constructor(remote, mediaPrisma) {
        super();
        this.remote = remote;
        this.mediaPrisma = mediaPrisma;
    }
    async resolveCropGuideTaxonomyTags(guideId) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_CROP_GUIDE, { id: guideId });
        if (!data.cropGuide) {
            throw new common_1.NotFoundException("CropGuide not found");
        }
        return (data.cropGuide.taxonomyTags ?? []);
    }
    async resolveMediaInMarkdown(markdown) {
        const ids = (0, content_markdown_1.extractMediaRefs)(markdown);
        if (ids.length === 0)
            return markdown;
        const media = await this.mediaPrisma.media.findMany({
            where: { id: { in: ids } },
            select: { id: true, url: true },
        });
        const urlById = Object.fromEntries(media.map(item => [item.id, item.url]));
        return (0, content_markdown_1.resolveMediaRefs)(markdown, urlById);
    }
    async listCropGuides(params) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_CROP_GUIDES, {
            limit: params.limit ?? undefined,
            offset: params.offset ?? undefined,
            cropKind: params.cropKind ?? undefined,
            status: params.status ?? undefined,
            query: params.query ?? undefined,
            termKey: params.termKey ?? undefined,
        });
        return data.cropGuides;
    }
    async getCropGuideById(id) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_CROP_GUIDE, { id });
        if (!data.cropGuide) {
            throw new common_1.NotFoundException("CropGuide not found");
        }
        return data.cropGuide;
    }
    async getCropGuideBySlug(slug) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_CROP_GUIDE_BY_SLUG, { slug });
        if (!data.cropGuideBySlug) {
            throw new common_1.NotFoundException("CropGuide not found");
        }
        return data.cropGuideBySlug;
    }
    async listPublishedCropGuides(cropKind, termKey) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_PUBLISHED_CROP_GUIDES, {
            cropKind: cropKind ?? undefined,
            termKey: termKey ?? undefined,
        });
        return data.publishedCropGuides;
    }
    async getPublishedCropGuideBySlug(slug) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_PUBLISHED_CROP_GUIDE, { slug });
        if (!data.publishedCropGuide) {
            throw new common_1.NotFoundException("Published crop guide not found");
        }
        return data.publishedCropGuide;
    }
    async createCropGuide(params) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_CREATE_CROP_GUIDE, { input: params });
        return data.createCropGuide;
    }
    async updateCropGuide(params) {
        const { id, ...input } = params;
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_UPDATE_CROP_GUIDE, { id, input });
        return data.updateCropGuide;
    }
    async deleteCropGuide(id) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_DELETE_CROP_GUIDE, { id });
        return data.deleteCropGuide;
    }
    async publishCropGuide(id) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_PUBLISH_CROP_GUIDE, { id });
        return data.publishCropGuide;
    }
    async unpublishCropGuide(id) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_UNPUBLISH_CROP_GUIDE, { id });
        return data.unpublishCropGuide;
    }
    async listSitePages(status) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_SITE_PAGES, { status: status ?? undefined });
        return data.sitePages;
    }
    async getSitePageByKey(key) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_SITE_PAGE, { key });
        if (!data.sitePage) {
            throw new common_1.NotFoundException("SitePage not found");
        }
        return data.sitePage;
    }
    async getPublishedSitePageByKey(key) {
        const data = await this.remote.execute(content_remote_operations_1.QUERY_PUBLISHED_SITE_PAGE, { key });
        if (!data.publishedSitePage) {
            throw new common_1.NotFoundException("Published site page not found");
        }
        return data.publishedSitePage;
    }
    async upsertSitePage(params) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_UPSERT_SITE_PAGE, { input: params });
        return data.upsertSitePage;
    }
    async publishSitePage(key) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_PUBLISH_SITE_PAGE, { key });
        return data.publishSitePage;
    }
    async unpublishSitePage(key) {
        const data = await this.remote.execute(content_remote_operations_1.MUTATION_UNPUBLISH_SITE_PAGE, { key });
        return data.unpublishSitePage;
    }
};
exports.ContentRemoteService = ContentRemoteService;
exports.ContentRemoteService = ContentRemoteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [content_remote_graphql_client_1.ContentRemoteGraphqlClient,
        prisma_service_1.PrismaService])
], ContentRemoteService);
//# sourceMappingURL=content.remote-service.js.map