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
exports.ContentModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const content_remote_graphql_client_1 = require("./content-remote.graphql-client");
const content_remote_service_1 = require("./content.remote-service");
const content_resolver_1 = require("./content.resolver");
const content_service_1 = require("./content.service");
let ContentModule = class ContentModule {
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const url = this.config.get("CONTENT_SERVICE_URL")?.trim();
        const cutover = this.config.get("CONTENT_CUTOVER")?.trim() !== "false";
        if (cutover && !url) {
            throw new common_1.ServiceUnavailableException("CONTENT_CUTOVER requires CONTENT_SERVICE_URL (content-service)");
        }
    }
};
exports.ContentModule = ContentModule;
exports.ContentModule = ContentModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            content_remote_graphql_client_1.ContentRemoteGraphqlClient,
            content_remote_service_1.ContentRemoteService,
            { provide: content_service_1.ContentService, useClass: content_remote_service_1.ContentRemoteService },
            content_resolver_1.CropGuideResolver,
            content_resolver_1.SitePageResolver,
        ],
        exports: [content_service_1.ContentService, content_remote_graphql_client_1.ContentRemoteGraphqlClient],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ContentModule);
//# sourceMappingURL=content.module.js.map