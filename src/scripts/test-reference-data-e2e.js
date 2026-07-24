"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const reference_data_remote_graphql_client_1 = require("../modules/reference-data/reference-data-remote.graphql-client");
const brands_remote_service_1 = require("../modules/reference-data/brands.remote-service");
const products_remote_service_1 = require("../modules/reference-data/products.remote-service");
const reference_data_remote_operations_1 = require("../modules/reference-data/reference-data-remote.operations");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function main() {
    const config = new config_1.ConfigService(process.env);
    const url = config.get("REFERENCE_DATA_SERVICE_URL")?.trim();
    if (!url) {
        console.error("Reference data cutover e2e requires REFERENCE_DATA_SERVICE_URL (BK-MS-REFDATA-3)");
        process.exitCode = 1;
        return;
    }
    const remote = new reference_data_remote_graphql_client_1.ReferenceDataRemoteGraphqlClient(config);
    const brandsService = new brands_remote_service_1.BrandsRemoteService(remote);
    const productsService = new products_remote_service_1.ProductsRemoteService(remote);
    try {
        const brandsPage = await brandsService.list({ limit: 5, offset: 0 });
        assert(brandsPage.total >= 0, "brands list total");
        const data = await remote.execute(reference_data_remote_operations_1.QUERY_PRODUCTS, { limit: 5, offset: 0 });
        assert(data.products.total >= 0, "products list total");
        if (brandsPage.items.length > 0) {
            const brand = await brandsService.getById(brandsPage.items[0].id);
            assert(brand, "getById brand");
            const productsPage = await productsService.list({
                limit: 5,
                offset: 0,
                brandId: brand.id,
            });
            if (productsPage.items.length > 0) {
                const product = await productsService.getById(productsPage.items[0].id);
                assert(product, "getById product");
            }
        }
        console.log("Reference data cutover smoke OK (remote via", url, ")");
    }
    catch (error) {
        console.error("Reference data cutover smoke FAILED", error);
        process.exitCode = 1;
    }
}
void main();
//# sourceMappingURL=test-reference-data-e2e.js.map