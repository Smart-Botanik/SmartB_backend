"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_markdown_1 = require("@growing/content-markdown");
const content_prisma_for_migration_1 = require("./content-prisma-for-migration");
async function main() {
    const prisma = (0, content_prisma_for_migration_1.createContentPrisma)((0, content_prisma_for_migration_1.requireContentDatabaseUrl)());
    try {
        const guides = await prisma.cropGuide.findMany();
        let migrated = 0;
        for (const guide of guides) {
            if (guide.bodySiteMd.trim())
                continue;
            const markdown = (0, content_markdown_1.blocksToMarkdown)(guide.body);
            if (!markdown.trim())
                continue;
            await prisma.cropGuide.update({
                where: { id: guide.id },
                data: { bodySiteMd: markdown },
            });
            migrated += 1;
            console.log(`Migrated: ${guide.slug}`);
        }
        console.log(`Done. Migrated ${migrated} of ${guides.length} guides.`);
    }
    finally {
        await prisma.$disconnect();
    }
}
void main();
//# sourceMappingURL=migrate-guides-to-md.js.map