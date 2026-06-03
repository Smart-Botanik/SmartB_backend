import { PrismaClient } from "@prisma/client";
import { TaxonomyRepository } from "../modules/taxonomy/taxonomy.repository";
import { TaxonomyTagService } from "../modules/taxonomy/taxonomy-tag.service";
import { seedTaxonomyTags } from "./seed-taxonomy-tags";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const service = new TaxonomyTagService(new TaxonomyRepository(prisma as never));

  try {
    try {
      await seedTaxonomyTags(prisma);
    } catch (seedError) {
      // Demo product link in seed may fail on stale DB; tags/scopes are upserted first.
      console.warn(
        "[test:taxonomy:e2e] seedTaxonomyTags warning:",
        seedError instanceof Error ? seedError.message : seedError,
      );
    }

    const scopes = await service.listScopes();
    assert(scopes.length >= 2, "Expected at least 2 taxonomy scopes (crop, guides)");
    assert(
      scopes.some(scope => scope.key === "crop"),
      "Expected crop scope",
    );

    const forest = await service.forest("crop");
    assert(forest.length > 0, "Expected non-empty taxonomyForest for crop");

    const rootPage = await service.list({
      scopeKey: "crop",
      parentId: null,
      limit: 50,
      offset: 0,
    });
    assert(rootPage.total > 0, "Expected taxonomyTags total > 0 for crop roots");

    const tomato = rootPage.items.find(tag => tag.key === "crop.tomato");
    assert(tomato, "Expected crop.tomato tag in list");
    assert(tomato.id, "Expected crop.tomato id");

    const byId = await service.getById(tomato.id);
    assert(byId.key === "crop.tomato", "getById should return crop.tomato");

    console.log("Taxonomy smoke OK");
  } catch (error) {
    console.error("Taxonomy smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
