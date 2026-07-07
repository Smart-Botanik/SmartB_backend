import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ContentFacetsService } from "../modules/content-facets/content-facets.service";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";
import { seedCultureFacets } from "./seed-culture-facets";

async function main() {
  const url = process.env.TAXONOMY_SERVICE_URL?.trim();
  if (!url) {
    console.error(
      "Culture facets seed requires TAXONOMY_SERVICE_URL (taxonomy-service running)",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const config = new ConfigService(process.env);
  const taxonomyTagService = new TaxonomyTagRemoteService(
    new TaxonomyRemoteGraphqlClient(config),
  );
  const contentFacetsService = new ContentFacetsService(
    prisma as never,
    taxonomyTagService,
  );

  try {
    const result = await seedCultureFacets({
      prisma,
      taxonomyTagService,
      contentFacetsService,
    });
    console.log(`Seeded culture facets: ${result.published} published profiles`);
  } catch (error) {
    console.error("Culture facets seed FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
