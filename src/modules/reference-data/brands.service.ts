import { Injectable } from "@nestjs/common";
import type { BrandCategoryValue } from "./reference-data.types";

/** DI token; runtime: {@link BrandsRemoteService} (BK-MS-REFDATA-3). */
@Injectable()
export abstract class BrandsService {
  abstract list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: BrandCategoryValue | null;
  }): Promise<{ items: unknown[]; total: number }>;

  abstract getById(id: string): Promise<unknown>;

  abstract create(params: {
    name: string;
    category: BrandCategoryValue | string;
    description?: string | null;
    avatarMediaId?: string | null;
  }): Promise<unknown>;

  abstract update(params: {
    id: string;
    name?: string | null;
    category?: BrandCategoryValue | string | null;
    description?: string | null;
    avatarMediaId?: string | null;
  }): Promise<unknown>;

  abstract delete(id: string): Promise<boolean>;
}
