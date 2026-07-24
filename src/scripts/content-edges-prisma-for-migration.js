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
exports.createContentEdgesPrisma = createContentEdgesPrisma;
exports.requireContentEdgesDatabaseUrl = requireContentEdgesDatabaseUrl;
const path = __importStar(require("node:path"));
function createContentEdgesPrisma(targetUrl) {
    const clientPath = path.join(__dirname, "../../../services/content-edges/node_modules/@prisma/client");
    try {
        const { PrismaClient: ContentEdgesPrismaClient } = require(clientPath);
        return new ContentEdgesPrismaClient({
            datasources: { db: { url: targetUrl } },
        });
    }
    catch {
        throw new Error("content-edges Prisma client not found — run: cd services/content-edges && npm install && npm run prisma:generate");
    }
}
function requireContentEdgesDatabaseUrl() {
    const url = process.env.CONTENT_EDGES_DATABASE_URL?.trim();
    if (!url) {
        throw new Error("CONTENT_EDGES_DATABASE_URL is required (content-edges DB after BK-MS-EDGES cutover)");
    }
    return url;
}
//# sourceMappingURL=content-edges-prisma-for-migration.js.map