"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const content_edges_remote_graphql_client_1 = require("../modules/content-facets/content-edges-remote.graphql-client");
const content_facets_remote_service_1 = require("../modules/content-facets/content-facets.remote-service");
const taxonomy_remote_graphql_client_1 = require("../modules/taxonomy/taxonomy-remote.graphql-client");
const taxonomy_tag_remote_service_1 = require("../modules/taxonomy/taxonomy-tag.remote-service");
const seed_culture_facets_1 = require("./seed-culture-facets");
async function main() {
    const taxonomyUrl = process.env.TAXONOMY_SERVICE_URL?.trim();
    const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
    if (!taxonomyUrl || !edgesUrl) {
        console.error("Culture facets seed requires TAXONOMY_SERVICE_URL and CONTENT_EDGES_SERVICE_URL");
        process.exitCode = 1;
        return;
    }
    const prisma = new client_1.PrismaClient();
    const config = new config_1.ConfigService(process.env);
    const taxonomyTagService = new taxonomy_tag_remote_service_1.TaxonomyTagRemoteService(new taxonomy_remote_graphql_client_1.TaxonomyRemoteGraphqlClient(config));
    const contentFacetsService = new content_facets_remote_service_1.ContentFacetsRemoteService(new content_edges_remote_graphql_client_1.ContentEdgesRemoteGraphqlClient(config), prisma);
    try {
        const result = await (0, seed_culture_facets_1.seedCultureFacets)({
            prisma,
            taxonomyTagService,
            contentFacetsService,
        });
        console.log(`Seeded culture facets: ${result.published} published profiles`);
    }
    catch (error) {
        console.error("Culture facets seed FAILED", error);
        process.exitCode = 1;
    }
    finally {
        await prisma.$disconnect();
    }
}
void main();
//# sourceMappingURL=run-seed-culture-facets.js.map