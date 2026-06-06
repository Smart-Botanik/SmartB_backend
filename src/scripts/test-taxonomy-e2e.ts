import { ConfigService } from "@nestjs/config";
import { TaxonomyRemoteGraphqlClient } from "../modules/taxonomy/taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "../modules/taxonomy/taxonomy-tag.remote-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const config = new ConfigService(process.env);
  const url = config.get<string>("TAXONOMY_SERVICE_URL")?.trim();
  if (!url) {
    console.error(
      "Taxonomy cutover e2e requires TAXONOMY_SERVICE_URL (BK-MS-TAX-3)",
    );
    process.exitCode = 1;
    return;
  }

  const remote = new TaxonomyRemoteGraphqlClient(config);
  const service = new TaxonomyTagRemoteService(remote);

  try {
    const scopes = await service.listScopes();
    assert(scopes.length >= 2, "Expected at least 2 taxonomy scopes (crop, guides)");
    assert(
      (scopes as Array<{ key: string }>).some(scope => scope.key === "crop"),
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

    const tomato = rootPage.items.find(
      (tag: { key: string }) => tag.key === "crop.tomato",
    );
    assert(tomato, "Expected crop.tomato tag in list");

    const byId = await service.getById((tomato as { id: string }).id);
    assert((byId as { key: string }).key === "crop.tomato", "getById crop.tomato");

    const byKeys = await service.tagsByKeys(["crop.tomato"]);
    assert(byKeys.length === 1, "tagsByKeys single");
    assert(
      (byKeys[0] as { key: string }).key === "crop.tomato",
      "tagsByKeys crop.tomato",
    );

    const connected = await service.connectByKeys(["crop.tomato"]);
    assert(connected.set.length === 1, "connectByKeys single");
    assert(
      connected.set[0].id === (tomato as { id: string }).id,
      "connectByKeys id",
    );

    console.log("Taxonomy cutover smoke OK (remote via", url, ")");
  } catch (error) {
    console.error("Taxonomy cutover smoke FAILED", error);
    process.exitCode = 1;
  }
}

void main();
