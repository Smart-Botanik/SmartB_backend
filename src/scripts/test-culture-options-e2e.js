"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const content_edges_remote_graphql_client_1 = require("../modules/content-facets/content-edges-remote.graphql-client");
const content_facets_remote_service_1 = require("../modules/content-facets/content-facets.remote-service");
const culture_options_service_1 = require("../modules/content-facets/culture-options.service");
const taxonomy_remote_graphql_client_1 = require("../modules/taxonomy/taxonomy-remote.graphql-client");
const taxonomy_tag_remote_service_1 = require("../modules/taxonomy/taxonomy-tag.remote-service");
const seed_culture_facets_1 = require("./seed-culture-facets");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function main() {
    const taxonomyUrl = process.env.TAXONOMY_SERVICE_URL?.trim();
    const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
    if (!taxonomyUrl || !edgesUrl) {
        console.error("Culture options e2e requires TAXONOMY_SERVICE_URL and CONTENT_EDGES_SERVICE_URL");
        process.exitCode = 1;
        return;
    }
    const prisma = new client_1.PrismaClient();
    const config = new config_1.ConfigService(process.env);
    const taxonomyTagService = new taxonomy_tag_remote_service_1.TaxonomyTagRemoteService(new taxonomy_remote_graphql_client_1.TaxonomyRemoteGraphqlClient(config));
    const contentFacetsService = new content_facets_remote_service_1.ContentFacetsRemoteService(new content_edges_remote_graphql_client_1.ContentEdgesRemoteGraphqlClient(config), prisma);
    const cultureOptionsService = new culture_options_service_1.CultureOptionsService(taxonomyTagService, contentFacetsService);
    try {
        await (0, seed_culture_facets_1.seedCultureFacets)({
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
        assert(tomato.preview?.id, "Expected tomato preview/thumbnail media");
        assert(tomato.preview?.url?.includes("/uploads/content-facets/culture/tomato/"), "Expected tomato preview url from seed media");
        const tomatoTags = (await taxonomyTagService.tagsByKeys(["crop.tomato"]));
        const tomatoBundle = await contentFacetsService.findPublishedBundle({
            type: "TAXONOMY_TAG",
            id: tomatoTags[0]?.id ?? "",
            key: "crop.tomato",
        });
        assert(Boolean(tomatoBundle?.words?.hubLead?.trim()), "Expected tomato hub_lead from published facets");
        assert(tomatoBundle?.imageM?.id, "Expected tomato IMAGE_M on published bundle");
        assert((tomatoBundle?.previews?.length ?? 0) >= 1, "Expected tomato PREVIEW on published bundle");
        const eggplant = catalog.options.find(o => o.tagKey === "crop.eggplant");
        assert(eggplant?.icon.emoji === "🍆", "Expected eggplant emoji");
        assert(eggplant?.preview?.id, "Expected eggplant preview media");
        const zucchini = catalog.options.find(o => o.tagKey === "crop.zucchini");
        assert(zucchini?.icon.emoji === "🥒", "Expected zucchini emoji from profile seed");
        console.log("Culture options smoke OK");
    }
    catch (error) {
        console.error("Culture options smoke FAILED", error);
        process.exitCode = 1;
    }
    finally {
        await prisma.$disconnect();
    }
}
void main();
//# sourceMappingURL=test-culture-options-e2e.js.map