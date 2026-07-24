"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContentPrisma = createContentPrisma;
exports.requireContentDatabaseUrl = requireContentDatabaseUrl;
const path = __importStar(require("node:path"));
function createContentPrisma(targetUrl) {
    const clientPath = path.join(__dirname, "../../../services/content/node_modules/@prisma/client");
    try {
        const { PrismaClient: ContentPrismaClient } = require(clientPath);
        return new ContentPrismaClient({
            datasources: { db: { url: targetUrl } },
        });
    }
    catch {
        throw new Error("content Prisma client not found — run: cd services/content && npm install && npm run prisma:generate");
    }
}
function requireContentDatabaseUrl() {
    const url = process.env.CONTENT_DATABASE_URL?.trim();
    if (!url) {
        throw new Error("CONTENT_DATABASE_URL is required (content-service DB after BK-MS-CONTENT cutover)");
    }
    return url;
}
//# sourceMappingURL=content-prisma-for-migration.js.map