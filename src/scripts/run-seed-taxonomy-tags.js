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
exports.seedTaxonomyTags = seedTaxonomyTags;
const node_child_process_1 = require("node:child_process");
const path = __importStar(require("node:path"));
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
async function seedTaxonomyTags() {
    const url = requireEnv("TAXONOMY_DATABASE_URL");
    const taxonomyDir = path.resolve(__dirname, "../../../services/taxonomy");
    const tsNode = path.join(taxonomyDir, "node_modules", ".bin", process.platform === "win32" ? "ts-node.cmd" : "ts-node");
    const result = (0, node_child_process_1.spawnSync)(tsNode, ["prisma/seed.ts"], {
        cwd: taxonomyDir,
        env: { ...process.env, DATABASE_URL: url },
        stdio: "inherit",
        shell: process.platform === "win32",
    });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error("taxonomy db:seed failed — run: cd services/taxonomy && npm install && npm run prisma:generate");
    }
    return { ok: true };
}
async function main() {
    await seedTaxonomyTags();
    console.log("Seeded taxonomy tags");
}
if (require.main === module) {
    void main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
//# sourceMappingURL=run-seed-taxonomy-tags.js.map