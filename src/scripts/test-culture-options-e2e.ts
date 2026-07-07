import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ContentFacetsService } from "../modules/content-facets/content-facets.service";
import { CultureOptionsService } from "../modules/content-facets/culture-options.service";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";
import { seedCultureFacets } from "./seed-culture-facets";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const url = process.env.TAXONOMY_SERVICE_URL?.trim();
  if (!url) {
    console.error("Culture options e2e requires TAXONOMY_SERVICE_URL");
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
  const cultureOptionsService = new CultureOptionsService(
    taxonomyTagService,
    contentFacetsService,
  );

  try {
    await seedCultureFacets({
      prisma,
      taxonomyTagService,
      contentFacetsService,
    });

    const catalog = await cultureOptionsService.getPublishedCultureOptions();
    assert(catalog.options.length >= 4, "Expected at least 4 culture options");

    const tomato = catalog.options.find(o => o.tagKey === "crop.tomato");
    assert(tomato, "Expected crop.tomato option");
    assert(tomato.hubSlug === "tomat", "Expected hub slug tomat");
    assert(tomato.icon.kind === "EMOJI", "Expected emoji icon");
    assert(tomato.icon.emoji === "🍅", "Expected tomato emoji");

    const eggplant = catalog.options.find(o => o.tagKey === "crop.eggplant");
    assert(eggplant?.icon.emoji === "🍆", "Expected eggplant emoji");

    console.log("Culture options smoke OK");
  } catch (error) {
    console.error("Culture options smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
