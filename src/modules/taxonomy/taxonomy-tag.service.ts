import { Injectable } from "@nestjs/common";
import {
  type CropKind,
  type FlatTaxonomyTag,
  type TaxonomyTagNamespace,
  type TaxonomyTagStatus,
  type ValidateTaxonomyTagSelectionContext,
} from "@growing/contracts";

export type TaxonomyGroupDeleteStrategy =
  | "REASSIGN"
  | "CASCADE"
  | "PROMOTE_TO_ROOT";

export type TaxonomyTagConnectResult =
  | { set: { id: string }[] }
  | undefined;

/** DI token; runtime: {@link TaxonomyTagRemoteService} (BK-MS-TAX-3). */
@Injectable()
export abstract class TaxonomyTagService {
  abstract listScopes(): Promise<unknown[]>;

  abstract createScope(params: {
    key: string;
    label: string;
    description?: string | null;
    sortOrder?: number | null;
  }): Promise<unknown>;

  abstract forest(
    scopeKey: string,
    status?: TaxonomyTagStatus | null,
  ): Promise<unknown[]>;

  abstract list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    scopeKey?: string | null;
    namespace?: TaxonomyTagNamespace | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    status?: TaxonomyTagStatus | null;
  }): Promise<{ items: unknown[]; total: number }>;

  abstract getById(id: string): Promise<unknown>;

  abstract tagsByKeys(keys: string[]): Promise<unknown[]>;

  abstract create(params: {
    scopeKey?: string | null;
    key: string;
    namespace: TaxonomyTagNamespace;
    label: string;
    sortOrder?: number | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    variantAxis?: string | null;
    status?: TaxonomyTagStatus | null;
  }): Promise<unknown>;

  abstract update(params: {
    id: string;
    key?: string | null;
    namespace?: TaxonomyTagNamespace | null;
    label?: string | null;
    sortOrder?: number | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    variantAxis?: string | null;
    status?: TaxonomyTagStatus | null;
  }): Promise<unknown>;

  abstract delete(id: string): Promise<boolean>;

  abstract deleteGroup(params: {
    id: string;
    strategy: TaxonomyGroupDeleteStrategy;
    newParentId?: string | null;
  }): Promise<boolean>;

  abstract connectByIds(
    taxonomyTagIds: string[] | null | undefined,
    ctx?: ValidateTaxonomyTagSelectionContext,
  ): Promise<TaxonomyTagConnectResult>;

  abstract connectByKeys(keys: string[]): Promise<{ set: { id: string }[] }>;
}

export type { FlatTaxonomyTag };
