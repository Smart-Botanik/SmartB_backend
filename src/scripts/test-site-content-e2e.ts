import { ConfigService } from "@nestjs/config";
import { ContentStatus, PrismaClient } from "@prisma/client";
import { ContentService } from "../modules/content/content.service";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";
import { seedSiteContent } from "./seed-site-content";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const url = process.env.TAXONOMY_SERVICE_URL?.trim();
  if (!url) {
    console.error(
      "Site content e2e after TAX-3 requires TAXONOMY_SERVICE_URL + TAXONOMY_DATABASE_URL for seed",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const config = new ConfigService(process.env);
  const taxonomyTagService = new TaxonomyTagRemoteService(
    new TaxonomyRemoteGraphqlClient(config),
  );
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
      const afterDraft = await service.listPublishedCropGuides();
      assert(
        afterDraft.every(g => g.slug !== "ogurcy"),
        "Draft guide should not appear in published list",
      );
    } finally {
      if (draftSeen) {
        await prisma.cropGuide.update({
          where: { slug: "ogurcy" },
          data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
        });
      }
    }

    console.log("Site content smoke OK");
  } catch (error) {
    console.error("Site content smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
