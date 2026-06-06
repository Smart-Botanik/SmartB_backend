import { Injectable } from "@nestjs/common";

/** DI token; runtime: {@link ProductsRemoteService} (BK-MS-REFDATA-3). */
@Injectable()
export abstract class ProductsService {
  abstract list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    category?: string | null;
    brandId?: string | null;
  }): Promise<{ items: unknown[]; total: number }>;

  abstract getById(id: string): Promise<unknown>;

  abstract create(params: {
    name: string;
    category: string;
    brandId: string;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }): Promise<unknown>;

  abstract update(params: {
    id: string;
    name?: string | null;
    category?: string | null;
    brandId?: string | null;
    avatarMediaId?: string | null;
    taxonomyTagIds?: string[] | null;
  }): Promise<unknown>;

  abstract delete(id: string): Promise<boolean>;
}
