"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const content_edges_remote_graphql_client_1 = require("../modules/content-facets/content-edges-remote.graphql-client");
const content_facets_remote_service_1 = require("../modules/content-facets/content-facets.remote-service");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function main() {
    const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
    if (!edgesUrl) {
        console.error("Content facets e2e requires CONTENT_EDGES_SERVICE_URL (content-edges)");
        process.exitCode = 1;
        return;
    }
    const prisma = new client_1.PrismaClient();
    const config = new config_1.ConfigService(process.env);
    const service = new content_facets_remote_service_1.ContentFacetsRemoteService(new content_edges_remote_graphql_client_1.ContentEdgesRemoteGraphqlClient(config), prisma);
    const subject = {
        type: "PRODUCT",
        id: "cf-smoke-product-1",
    };
    try {
        const media = await prisma.media.create({
            data: {
                provider: "local",
                bucket: "uploads",
                key: "content-facets/smoke-logo.png",
                url: "/uploads/content-facets/smoke-logo.png",
                mime: "image/png",
                width: 64,
                height: 64,
            },
        });
        const profile = await service.upsertProfile({
            subject,
            profileKind: "product",
            slots: [
                {
                    kind: "PREVIEW",
                    mediaId: media.id,
                    sortOrder: 0,
                },
                {
                    kind: "TEXT",
                    role: "highlight",
                    textValue: "Smoke test highlight",
                    sortOrder: 0,
                },
            ],
        });
        assert(profile.status === "DRAFT", "Expected DRAFT after upsert");
        assert(profile.slots.length === 2, "Expected 2 slots");
        let draftMissing = false;
        try {
            await service.getPublishedBundle(subject);
        }
        catch {
            draftMissing = true;
        }
        assert(draftMissing, "Draft profile must not be public");
        await service.publishProfile(subject);
        const bundle = await service.getPublishedBundle(subject);
        assert(bundle.revision.length > 0, "Expected revision");
        assert(bundle.previews.length === 1, "Expected preview media");
        assert(bundle.words.highlight === "Smoke test highlight", "Expected highlight text");
        const batch = await service.getPublishedBundlesBatch([subject]);
        assert(batch.length === 1, "Batch should return published profile");
        await service.unpublishProfile(subject);
        await service.upsertProfile({
            subject,
            profileKind: "product",
            slots: [],
        });
        console.log("Content facets smoke OK (content-edges remote)");
    }
    catch (error) {
        console.error("Content facets smoke FAILED", error);
        process.exitCode = 1;
    }
    finally {
        await prisma.$disconnect();
    }
}
void main();
//# sourceMappingURL=test-content-facets-e2e.js.map