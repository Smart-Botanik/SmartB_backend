/**
 * One-time markdown migration for CropGuide.body → bodySiteMd (content_db).
 */
import { blocksToMarkdown } from "@growing/content-markdown";
import {
  createContentPrisma,
  requireContentDatabaseUrl,
} from "./content-prisma-for-migration";

async function main() {
  const prisma = createContentPrisma(requireContentDatabaseUrl());

  try {
    const guides = await prisma.cropGuide.findMany();
    let migrated = 0;

    for (const guide of guides) {
      if (guide.bodySiteMd.trim()) continue;

      const markdown = blocksToMarkdown(guide.body);
      if (!markdown.trim()) continue;

      await prisma.cropGuide.update({
        where: { id: guide.id },
        data: { bodySiteMd: markdown },
      });
      migrated += 1;
      console.log(`Migrated: ${guide.slug}`);
    }

    console.log(`Done. Migrated ${migrated} of ${guides.length} guides.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
