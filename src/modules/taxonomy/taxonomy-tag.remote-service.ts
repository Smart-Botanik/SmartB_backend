import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type CropKind,
  type FlatTaxonomyTag,
  type TaxonomyTagNamespace,
  type TaxonomyTagStatus,
  type ValidateTaxonomyTagSelectionContext,
  validateTaxonomyTagSelection,
} from "@growing/contracts";
import { TaxonomyRemoteGraphqlClient } from "./taxonomy-remote.graphql-client";
import {
  MUTATION_CREATE_SCOPE,
  MUTATION_CREATE_TAG,
  MUTATION_DELETE_GROUP,
  MUTATION_DELETE_TAG,
  MUTATION_UPDATE_TAG,
  QUERY_TAXONOMY_FOREST,
  QUERY_TAXONOMY_SCOPES,
  QUERY_TAXONOMY_TAG,
  QUERY_TAXONOMY_TAGS,
  QUERY_TAXONOMY_TAGS_BY_KEYS,
  QUERY_TAXONOMY_TAGS_BY_KEYS_MINIMAL,
} from "./taxonomy-remote.operations";
import {
  TaxonomyTagService,
  type TaxonomyGroupDeleteStrategy,
} from "./taxonomy-tag.service";

type RemoteTag = {
  id: string;
  scopeKey: string;
  key: string;
  namespace: TaxonomyTagNamespace;
  label: string;
  sortOrder: number;
  parentId: string | null;
  cropKind: CropKind | null;
  variantAxis: string | null;
  status: TaxonomyTagStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: RemoteTag[];
};

/** BFF proxy to taxonomy-service (BK-MS-TAX-2 / BK-MS-TAX-3 cutover). */
@Injectable()
export class TaxonomyTagRemoteService extends TaxonomyTagService {
  constructor(private readonly remote: TaxonomyRemoteGraphqlClient) {
    super();
  }

  async listScopes() {
    const data = await this.remote.execute<{ taxonomyScopes: unknown[] }>(
      QUERY_TAXONOMY_SCOPES,
    );
    return data.taxonomyScopes;
  }

  async createScope(params: {
    key: string;
    label: string;
    description?: string | null;
    sortOrder?: number | null;
  }) {
    const data = await this.remote.execute<{ createTaxonomyScope: unknown }>(
      MUTATION_CREATE_SCOPE,
      { input: params },
    );
    return data.createTaxonomyScope;
  }

  async forest(scopeKey: string, status?: TaxonomyTagStatus | null) {
    const data = await this.remote.execute<{ taxonomyForest: RemoteTag[] }>(
      QUERY_TAXONOMY_FOREST,
      { scopeKey, status: status ?? undefined },
    );
    return data.taxonomyForest;
  }

  async list(params: {
    limit?: number;
    offset?: number;
    query?: string | null;
    scopeKey?: string | null;
    namespace?: TaxonomyTagNamespace | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    status?: TaxonomyTagStatus | null;
  }) {
    const data = await this.remote.execute<{
      taxonomyTags: { items: RemoteTag[]; total: number };
    }>(QUERY_TAXONOMY_TAGS, {
      limit: params.limit ?? undefined,
      offset: params.offset ?? undefined,
      query: params.query ?? undefined,
      scopeKey: params.scopeKey ?? undefined,
      namespace: params.namespace ?? undefined,
      parentId: params.parentId ?? undefined,
      cropKind: params.cropKind ?? undefined,
      status: params.status ?? undefined,
    });
    return data.taxonomyTags;
  }

  async getById(id: string) {
    const data = await this.remote.execute<{ taxonomyTag: RemoteTag | null }>(
      QUERY_TAXONOMY_TAG,
      { id },
    );
    if (!data.taxonomyTag) {
      throw new NotFoundException("TaxonomyTag not found");
    }
    return data.taxonomyTag;
  }

  async tagsByKeys(keys: string[]) {
    if (keys.length === 0) {
      return [];
    }
    const data = await this.remote.execute<{
      taxonomyTagsByKeys: RemoteTag[];
    }>(QUERY_TAXONOMY_TAGS_BY_KEYS, { keys });
    return data.taxonomyTagsByKeys;
  }

  async create(params: {
    scopeKey?: string | null;
    key: string;
    namespace: TaxonomyTagNamespace;
    label: string;
    sortOrder?: number | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    variantAxis?: string | null;
    status?: TaxonomyTagStatus | null;
  }) {
    const data = await this.remote.execute<{ createTaxonomyTag: RemoteTag }>(
      MUTATION_CREATE_TAG,
      { input: params },
    );
    return data.createTaxonomyTag;
  }

  async update(params: {
    id: string;
    key?: string | null;
    namespace?: TaxonomyTagNamespace | null;
    label?: string | null;
    sortOrder?: number | null;
    parentId?: string | null;
    cropKind?: CropKind | null;
    variantAxis?: string | null;
    status?: TaxonomyTagStatus | null;
  }) {
    const { id, ...input } = params;
    const data = await this.remote.execute<{ updateTaxonomyTag: RemoteTag }>(
      MUTATION_UPDATE_TAG,
      { id, input },
    );
    return data.updateTaxonomyTag;
  }

  async delete(id: string) {
    const data = await this.remote.execute<{ deleteTaxonomyTag: boolean }>(
      MUTATION_DELETE_TAG,
      { id },
    );
    return data.deleteTaxonomyTag;
  }

  async deleteGroup(params: {
    id: string;
    strategy: TaxonomyGroupDeleteStrategy;
    newParentId?: string | null;
  }) {
    const data = await this.remote.execute<{ deleteTaxonomyGroup: boolean }>(
      MUTATION_DELETE_GROUP,
      {
        id: params.id,
        strategy: params.strategy,
        newParentId: params.newParentId ?? undefined,
      },
    );
    return data.deleteTaxonomyGroup;
  }

  async connectByIds(
    taxonomyTagIds: string[] | null | undefined,
    ctx: ValidateTaxonomyTagSelectionContext = {},
  ) {
    if (taxonomyTagIds == null) {
      return undefined;
    }
    if (taxonomyTagIds.length === 0) {
      return { set: [] as { id: string }[] };
    }

    const tags = await Promise.all(
      taxonomyTagIds.map(async id => {
        const tag = await this.getById(id);
        return tag;
      }),
    );

    const validation = validateTaxonomyTagSelection(
      tags.map(tag => this.toFlatTag(tag)),
      taxonomyTagIds,
      ctx,
    );
    if (!validation.ok) {
      throw new BadRequestException(validation.errors.join("; "));
    }

    return { set: tags.map(tag => ({ id: tag.id })) };
  }

  async connectByKeys(keys: string[]) {
    if (keys.length === 0) {
      return { set: [] as { id: string }[] };
    }

    const data = await this.remote.execute<{
      taxonomyTagsByKeys: Array<{ id: string; key: string }>;
    }>(QUERY_TAXONOMY_TAGS_BY_KEYS_MINIMAL, { keys });

    return { set: data.taxonomyTagsByKeys.map(tag => ({ id: tag.id })) };
  }

  private toFlatTag(tag: RemoteTag): FlatTaxonomyTag {
    return {
      id: tag.id,
      key: tag.key,
      namespace: tag.namespace,
      label: tag.label,
      sortOrder: tag.sortOrder,
      parentId: tag.parentId,
      cropKind: tag.cropKind,
      variantAxis: tag.variantAxis,
      status: tag.status,
    };
  }
}
