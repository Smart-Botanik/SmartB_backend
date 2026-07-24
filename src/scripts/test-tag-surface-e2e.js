"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const content_remote_graphql_client_1 = require("../modules/content/content-remote.graphql-client");
const content_remote_service_1 = require("../modules/content/content.remote-service");
const content_edges_remote_graphql_client_1 = require("../modules/content-facets/content-edges-remote.graphql-client");
const content_facets_remote_service_1 = require("../modules/content-facets/content-facets.remote-service");
const tag_surface_service_1 = require("../modules/content-facets/tag-surface.service");
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
    const contentUrl = process.env.CONTENT_SERVICE_URL?.trim();
    const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
    if (!taxonomyUrl || !contentUrl || !edgesUrl) {
        console.error("Tag surface e2e requires TAXONOMY_SERVICE_URL, CONTENT_SERVICE_URL, CONTENT_EDGES_SERVICE_URL");
        process.exitCode = 1;
        return;
    }
    const prisma = new client_1.PrismaClient();
    const config = new config_1.ConfigService(process.env);
    const taxonomyTagService = new taxonomy_tag_remote_service_1.TaxonomyTagRemoteService(new taxonomy_remote_graphql_client_1.TaxonomyRemoteGraphqlClient(config));
    const contentFacetsService = new content_facets_remote_service_1.ContentFacetsRemoteService(new content_edges_remote_graphql_client_1.ContentEdgesRemoteGraphqlClient(config), prisma);
    const contentService = new content_remote_service_1.ContentRemoteService(new content_remote_graphql_client_1.ContentRemoteGraphqlClient(config), prisma);
    const tagSurfaceService = new tag_surface_service_1.TagSurfaceService(taxonomyTagService, contentFacetsService, contentService);
    try {
        await (0, seed_culture_facets_1.seedCultureFacets)({
            prisma,
            taxonomyTagService,
            contentFacetsService,
        });
        const surface = await tagSurfaceService.getPublishedTagSurface("crop.tomato");
        assert(surface, "Expected TagSurface for crop.tomato");
        assert(surface.tag.key === "crop.tomato", "Expected tomato tag key");
        assert(surface.facets?.chipIcon === "🍅", "Expected tomato emoji facet");
        assert(Boolean(surface.facets?.words?.hubLead?.trim()), "Expected tomato hub_lead TEXT");
        assert(surface.facets?.imageM?.id, "Expected tomato IMAGE_M media stitch");
        assert(surface.facets?.imageM?.url?.includes("/uploads/content-facets/culture/tomato/"), "Expected tomato IMAGE_M url from seed media");
        assert((surface.facets?.previews?.length ?? 0) >= 1, "Expected tomato PREVIEW media stitch");
        assert(Array.isArray(surface.guides), "Expected guides array");
        assert(surface.revision.length > 0, "Expected revision");
        const missing = await tagSurfaceService.getPublishedTagSurface("crop.unknown");
        assert(missing === null, "Expected null for unknown tag");
        console.log("Tag surface smoke OK");
    }
    catch (error) {
        console.error("Tag surface smoke FAILED", error);
        process.exitCode = 1;
    }
    finally {
        await prisma.$disconnect();
    }
}
void main();
//# sourceMappingURL=test-tag-surface-e2e.js.map