import { PrismaClient } from "@prisma/client";
import { blocksToMarkdown } from "@growing/content-markdown";

async function main() {
  const prisma = new PrismaClient();

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
