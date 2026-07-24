"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const path_1 = require("path");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const outputArg = process.argv[2];
        const defaultOutputPath = (0, path_1.resolve)(process.cwd(), "..", "packages", "contracts", "schema", "registry-manifest.json");
        const outputPath = (0, path_1.resolve)(process.cwd(), outputArg ?? defaultOutputPath);
        const registries = await prisma.actionPathRegistry.findMany({
            orderBy: { actionPath: "asc" },
            include: { tag: true },
        });
        const manifest = {
            version: 1,
            exportedAt: new Date().toISOString(),
            items: registries.map((r) => ({
                id: r.id,
                actionPath: r.actionPath,
                targetType: r.targetType,
                mapping: r.mapping,
                conditions: r.conditions,
                autoTagRules: r.autoTagRules,
                schema: r.schema,
                tagId: r.tagId,
                tag: r.tag
                    ? {
                        id: r.tag.id,
                        label: r.tag.label,
                        targetType: r.tag.targetType,
                        color: r.tag.color,
                        icon: r.tag.icon,
                        category: r.tag.category,
                    }
                    : null,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            })),
        };
        await (0, promises_1.mkdir)((0, path_1.dirname)(outputPath), { recursive: true });
        await (0, promises_1.writeFile)(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
        console.log(`Exported ${manifest.items.length} ActionPathRegistry entries to ${outputPath}`);
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=export-registry-manifest.js.map