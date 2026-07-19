import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ContentEdgesRemoteGraphqlClient } from "../modules/content-facets/content-edges-remote.graphql-client";
import { ContentFacetsRemoteService } from "../modules/content-facets/content-facets.remote-service";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";
import { seedCultureFacets } from "./seed-culture-facets";

async function main() {
  const taxonomyUrl = process.env.TAXONOMY_SERVICE_URL?.trim();
  const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
  if (!taxonomyUrl || !edgesUrl) {
    console.error(
      "Culture facets seed requires TAXONOMY_SERVICE_URL and CONTENT_EDGES_SERVICE_URL",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const config = new ConfigService(process.env);
  const taxonomyTagService = new TaxonomyTagRemoteService(
    new TaxonomyRemoteGraphqlClient(config),
  );
  const contentFacetsService = new ContentFacetsRemoteService(
    new ContentEdgesRemoteGraphqlClient(config),
    prisma as never,
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
