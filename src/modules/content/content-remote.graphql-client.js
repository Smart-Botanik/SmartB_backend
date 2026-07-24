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
exports.ContentRemoteGraphqlClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ContentRemoteGraphqlClient = class ContentRemoteGraphqlClient {
    constructor(config) {
        this.config = config;
    }
    isEnabled() {
        return Boolean(this.config.get("CONTENT_SERVICE_URL")?.trim());
    }
    async execute(query, variables) {
        const baseUrl = this.config.get("CONTENT_SERVICE_URL")?.trim();
        if (!baseUrl) {
            throw new common_1.ServiceUnavailableException("CONTENT_SERVICE_URL is not configured");
        }
        const headers = {
            "Content-Type": "application/json",
        };
        const internalKey = this.config
            .get("CONTENT_SERVICE_INTERNAL_KEY")
            ?.trim();
        if (internalKey) {
            headers["X-Content-Internal-Key"] = internalKey;
        }
        let response;
        try {
            response = await fetch(`${baseUrl.replace(/\/$/, "")}/graphql`, {
                method: "POST",
                headers,
                body: JSON.stringify({ query, variables }),
            });
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new common_1.ServiceUnavailableException(`Content service unavailable at ${baseUrl} (${reason}). Start services/content: npm run dev`);
        }
        if (!response.ok) {
            throw new common_1.ServiceUnavailableException(`Content service HTTP ${response.status}`);
        }
        const payload = (await response.json());
        if (payload.errors?.length) {
            throw new common_1.ServiceUnavailableException(payload.errors.map(error => error.message).join("; "));
        }
        if (!payload.data) {
            throw new common_1.ServiceUnavailableException("Content service returned empty data");
        }
        return payload.data;
    }
};
exports.ContentRemoteGraphqlClient = ContentRemoteGraphqlClient;
exports.ContentRemoteGraphqlClient = ContentRemoteGraphqlClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ContentRemoteGraphqlClient);
//# sourceMappingURL=content-remote.graphql-client.js.map