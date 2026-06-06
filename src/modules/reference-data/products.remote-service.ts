import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ReferenceDataRemoteGraphqlClient } from "./reference-data-remote.graphql-client";
import {
  MUTATION_CREATE_PRODUCT,
  MUTATION_DELETE_PRODUCT,
  MUTATION_UPDATE_PRODUCT,
  QUERY_PRODUCT,
  QUERY_PRODUCTS,
} from "./reference-data-remote.operations";

/**
 * BFF proxy to reference-data-service when REFERENCE_DATA_SERVICE_URL is set (BK-MS-REFDATA-2).
 */
@Injectable()
export class ProductsRemoteService extends ProductsService {
  constructor(private readonly remote: ReferenceDataRemoteGraphqlClient) {
    super();
  }

  async list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: string | null;
    brandId?: string | null;
  }) {
    const data = await this.remote.execute<{
      products: { items: unknown[]; total: number };
    }>(QUERY_PRODUCTS, {
      limit: params.limit ?? undefined,
      offset: params.offset ?? undefined,
      query: params.query ?? undefined,
      category: params.category ?? undefined,
      brandId: params.brandId ?? undefined,
    });
    return data.products;
  }

  async getById(id: string) {
    const data = await this.remote.execute<{ product: unknown | null }>(QUERY_PRODUCT, { id });
    if (!data.product) {
      throw new NotFoundException("Product not found");
    }
    return data.product;
  }

  async create(params: {
    name: string;
    category: string;
    brandId: string;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }) {
    const data = await this.remote.execute<{ createProduct: unknown }>(MUTATION_CREATE_PRODUCT, {
      input: params,
    });
    return data.createProduct;
  }

  async update(params: {
    id: string;
    name?: string | null;
    category?: string | null;
    brandId?: string | null;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }) {
    const { id, ...input } = params;
    const data = await this.remote.execute<{ updateProduct: unknown }>(MUTATION_UPDATE_PRODUCT, {
      id,
      input,
    });
    return data.updateProduct;
  }

  async delete(id: string) {
    const data = await this.remote.execute<{ deleteProduct: boolean }>(MUTATION_DELETE_PRODUCT, {
      id,
    });
    return data.deleteProduct;
  }
}
