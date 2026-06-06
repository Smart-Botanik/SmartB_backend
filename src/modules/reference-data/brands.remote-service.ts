import { Injectable, NotFoundException } from "@nestjs/common";
import type { BrandCategoryValue } from "./reference-data.types";
import { BrandsService } from "./brands.service";
import { ReferenceDataRemoteGraphqlClient } from "./reference-data-remote.graphql-client";
import {
  MUTATION_CREATE_BRAND,
  MUTATION_DELETE_BRAND,
  MUTATION_UPDATE_BRAND,
  QUERY_BRAND,
  QUERY_BRANDS,
} from "./reference-data-remote.operations";

/**
 * BFF proxy to reference-data-service when REFERENCE_DATA_SERVICE_URL is set (BK-MS-REFDATA-2).
 */
@Injectable()
export class BrandsRemoteService extends BrandsService {
  constructor(private readonly remote: ReferenceDataRemoteGraphqlClient) {
    super();
  }

  async list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: BrandCategoryValue | null;
  }) {
    const data = await this.remote.execute<{
      brands: { items: unknown[]; total: number };
    }>(QUERY_BRANDS, {
      limit: params.limit ?? undefined,
      offset: params.offset ?? undefined,
      query: params.query ?? undefined,
      category: params.category ?? undefined,
    });
    return data.brands;
  }

  async getById(id: string) {
    const data = await this.remote.execute<{ brand: unknown | null }>(QUERY_BRAND, { id });
    if (!data.brand) {
      throw new NotFoundException("Brand not found");
    }
    return data.brand;
  }

  async create(params: {
    name: string;
    category: BrandCategoryValue | string;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    const data = await this.remote.execute<{ createBrand: unknown }>(MUTATION_CREATE_BRAND, {
      input: params,
    });
    return data.createBrand;
  }

  async update(params: {
    id: string;
    name?: string | null;
    category?: BrandCategoryValue | string | null;
    description?: string | null;
    avatarMediaId?: string | null;
  }) {
    const { id, ...input } = params;
    const data = await this.remote.execute<{ updateBrand: unknown }>(MUTATION_UPDATE_BRAND, {
      id,
      input,
    });
    return data.updateBrand;
  }

  async delete(id: string) {
    const data = await this.remote.execute<{ deleteBrand: boolean }>(MUTATION_DELETE_BRAND, {
      id,
    });
    return data.deleteBrand;
  }
}
