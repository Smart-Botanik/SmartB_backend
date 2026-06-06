import { ConfigService } from "@nestjs/config";
import { ReferenceDataRemoteGraphqlClient } from "../modules/reference-data/reference-data-remote.graphql-client";
import { BrandsRemoteService } from "../modules/reference-data/brands.remote-service";
import { ProductsRemoteService } from "../modules/reference-data/products.remote-service";
import { QUERY_BRANDS, QUERY_PRODUCTS } from "../modules/reference-data/reference-data-remote.operations";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const config = new ConfigService(process.env);
  const url = config.get<string>("REFERENCE_DATA_SERVICE_URL")?.trim();
  if (!url) {
    console.error(
      "Reference data cutover e2e requires REFERENCE_DATA_SERVICE_URL (BK-MS-REFDATA-3)",
    );
    process.exitCode = 1;
    return;
  }

  const remote = new ReferenceDataRemoteGraphqlClient(config);
  const brandsService = new BrandsRemoteService(remote);
  const productsService = new ProductsRemoteService(remote);

  try {
    const brandsPage = await brandsService.list({ limit: 5, offset: 0 });
    assert(brandsPage.total >= 0, "brands list total");

    const data = await remote.execute<{
      products: { items: unknown[]; total: number };
    }>(QUERY_PRODUCTS, { limit: 5, offset: 0 });
    assert(data.products.total >= 0, "products list total");

    if (brandsPage.items.length > 0) {
      const brand = await brandsService.getById((brandsPage.items[0] as { id: string }).id);
      assert(brand, "getById brand");

      const productsPage = await productsService.list({
        limit: 5,
        offset: 0,
        brandId: (brand as { id: string }).id,
      });
      if (productsPage.items.length > 0) {
        const product = await productsService.getById(
          (productsPage.items[0] as { id: string }).id,
        );
        assert(product, "getById product");
      }
    }

    console.log("Reference data cutover smoke OK (remote via", url, ")");
  } catch (error) {
    console.error("Reference data cutover smoke FAILED", error);
    process.exitCode = 1;
  }
}

void main();
