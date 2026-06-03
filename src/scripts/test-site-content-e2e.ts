import { ContentStatus, PrismaClient } from "@prisma/client";
import { ContentService } from "../modules/content/content.service";
import { TaxonomyTagService } from "../modules/content/taxonomy-tag.service";
import { seedSiteContent } from "./seed-site-content";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const taxonomyTagService = new TaxonomyTagService(prisma as never);
  const service = new ContentService(prisma as never, taxonomyTagService);

  try {
    await seedSiteContent(prisma);

    const publishedGuides = await service.listPublishedCropGuides();
    assert(publishedGuides.length >= 4, "Expected at least 4 published guides");

    const pomidory = await service.getPublishedCropGuideBySlug("pomidory");
    assert(pomidory.title === "Помидоры", "Expected pomidory guide title");
    assert(Array.isArray(pomidory.body), "Expected guide body as JSON array");

    const home = await service.getPublishedSitePageByKey("home");
    assert(home.key === "home", "Expected home site page");
    assert(Array.isArray(home.sections), "Expected home sections array");

    const adminList = await service.listCropGuides({ limit: 10, offset: 0 });
    assert(adminList.total >= 4, "Admin list should include seeded guides");

    let draftSeen = false;
    try {
      await prisma.cropGuide.update({
        where: { slug: "ogurcy" },
        data: { status: ContentStatus.DRAFT },
      });
      draftSeen = true;

      const publishedAfterDraft = await service.listPublishedCropGuides();
      assert(
        !publishedAfterDraft.some(guide => guide.slug === "ogurcy"),
        "Draft guide must not appear in published list",
      );

      await expect(async () => {
        await service.getPublishedCropGuideBySlug("ogurcy");
      });
    } finally {
      if (draftSeen) {
        await prisma.cropGuide.update({
          where: { slug: "ogurcy" },
          data: {
            status: ContentStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });
      }
    }

    console.log("SITE content smoke OK:", {
      publishedGuides: publishedGuides.length,
      homeSections: (home.sections as unknown[]).length,
      adminTotal: adminList.total,
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function expect(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
    throw new Error("Expected action to reject");
  } catch (error) {
    if (error instanceof Error && error.message === "Expected action to reject") {
      throw error;
    }
  }
}

main().catch(error => {
  console.error("SITE content smoke FAILED:", error);
  process.exit(1);
});
