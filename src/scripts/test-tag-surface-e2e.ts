import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ContentRemoteGraphqlClient } from "../modules/content/content-remote.graphql-client";
import { ContentRemoteService } from "../modules/content/content.remote-service";
import { ContentEdgesRemoteGraphqlClient } from "../modules/content-facets/content-edges-remote.graphql-client";
import { ContentFacetsRemoteService } from "../modules/content-facets/content-facets.remote-service";
import { TagSurfaceService } from "../modules/content-facets/tag-surface.service";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";
import { seedCultureFacets } from "./seed-culture-facets";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const taxonomyUrl = process.env.TAXONOMY_SERVICE_URL?.trim();
  const contentUrl = process.env.CONTENT_SERVICE_URL?.trim();
  const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
  if (!taxonomyUrl || !contentUrl || !edgesUrl) {
    console.error(
      "Tag surface e2e requires TAXONOMY_SERVICE_URL, CONTENT_SERVICE_URL, CONTENT_EDGES_SERVICE_URL",
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
  const contentService = new ContentRemoteService(
    new ContentRemoteGraphqlClient(config),
    prisma as never,
  );
  const tagSurfaceService = new TagSurfaceService(
    taxonomyTagService,
    contentFacetsService,
    contentService,
  );

  try {
    await seedCultureFacets({
      prisma,
      taxonomyTagService,
      contentFacetsService,
    });

    const surface = await tagSurfaceService.getPublishedTagSurface("crop.tomato");
    assert(surface, "Expected TagSurface for crop.tomato");
    assert(surface.tag.key === "crop.tomato", "Expected tomato tag key");
    assert(surface.facets?.chipIcon === "🍅", "Expected tomato emoji facet");
    assert(
      Boolean(surface.facets?.words?.hubLead?.trim()),
      "Expected tomato hub_lead TEXT",
    );
    assert(surface.facets?.imageM?.id, "Expected tomato IMAGE_M media stitch");
    assert(
      surface.facets?.imageM?.url?.includes("/uploads/content-facets/culture/tomato/"),
      "Expected tomato IMAGE_M url from seed media",
    );
    assert(
      (surface.facets?.previews?.length ?? 0) >= 1,
      "Expected tomato PREVIEW media stitch",
    );
    assert(Array.isArray(surface.guides), "Expected guides array");
    assert(surface.revision.length > 0, "Expected revision");

    const missing = await tagSurfaceService.getPublishedTagSurface("crop.unknown");
    assert(missing === null, "Expected null for unknown tag");

    console.log("Tag surface smoke OK");
  } catch (error) {
    console.error("Tag surface smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
