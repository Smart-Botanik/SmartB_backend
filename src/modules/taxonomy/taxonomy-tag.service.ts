import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type FlatTaxonomyTag,
  type ValidateTaxonomyTagSelectionContext,
  validateTaxonomyTagSelection,
} from "@growing/contracts";
import {
  CropKind,
  Prisma,
  TaxonomyTagNamespace,
  TaxonomyTagStatus,
} from "@prisma/client";
import { TaxonomyRepository } from "./taxonomy.repository";

export type TaxonomyGroupDeleteStrategy =
  | "REASSIGN"
  | "CASCADE"
  | "PROMOTE_TO_ROOT";

@Injectable()
export class TaxonomyTagService {
  constructor(private readonly taxonomyRepo: TaxonomyRepository) {}

  async listScopes() {
    return this.taxonomyRepo.findManyScopes();
  }

  async createScope(params: {
    key: string;
    label: string;
    description?: string | null;
    sortOrder?: number | null;
  }) {
    const key = params.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]*$/.test(key)) {
      throw new BadRequestException(
        "scope key must start with a letter and contain only a-z, 0-9, _ or -",
      );
    }
    try {
      return await this.taxonomyRepo.createScope({
        key,
        label: params.label.trim(),
        description: params.description?.trim() || undefined,
        sortOrder: params.sortOrder ?? 0,
      });
    } catch (error) {
      this.handleUniqueViolation(error, "TaxonomyScope key already exists");
    }
  }

  async forest(scopeKey: string, status?: TaxonomyTagStatus | null) {
    await this.assertScopeExists(scopeKey);
    return this.taxonomyRepo.findForestRoots(scopeKey, status ?? undefined);
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
    const where: Prisma.TaxonomyTagWhereInput = {
      ...(params.scopeKey ? { scopeKey: params.scopeKey } : {}),
      ...(params.namespace ? { namespace: params.namespace } : {}),
      ...(params.parentId !== undefined && params.parentId !== null
        ? { parentId: params.parentId }
        : params.parentId === null
          ? { parentId: null }
          : {}),
      ...(params.cropKind ? { cropKind: params.cropKind } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.query
        ? {
            OR: [
              { label: { contains: params.query, mode: "insensitive" } },
              { key: { contains: params.query, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const { total, items } = await this.taxonomyRepo.listPage({
      where,
      limit: params.limit ?? undefined,
      offset: params.offset ?? undefined,
    });

    return { items, total };
  }

  async getById(id: string) {
    const tag = await this.taxonomyRepo.findTagById(id);
    if (!tag) {
      throw new NotFoundException("TaxonomyTag not found");
    }
    return tag;
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
    const key = params.key.trim();
    const scopeKey =
      params.scopeKey?.trim() ??
      (await this.resolveScopeKeyForNewTag(key, params.parentId ?? null));
    await this.assertScopeExists(scopeKey);
    await this.assertParentForNamespace(
      params.namespace,
      params.parentId ?? null,
      scopeKey,
    );
    if (params.namespace === TaxonomyTagNamespace.CROP && !params.cropKind) {
      throw new BadRequestException("cropKind is required for CROP namespace");
    }
    if (!key.startsWith(`${scopeKey}.`) && key !== scopeKey) {
      throw new BadRequestException(`key must start with "${scopeKey}."`);
    }
    try {
      return await this.taxonomyRepo.createTag({
        scopeKey,
        key,
        namespace: params.namespace,
        label: params.label.trim(),
        sortOrder: params.sortOrder ?? 0,
        parentId: params.parentId ?? undefined,
        cropKind: params.cropKind ?? undefined,
        variantAxis: params.variantAxis?.trim() ?? undefined,
        status: params.status ?? TaxonomyTagStatus.ACTIVE,
      });
    } catch (error) {
      this.handleUniqueViolation(error, "TaxonomyTag key already exists");
    }
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
    const existing = await this.getById(params.id);
    const namespace = params.namespace ?? existing.namespace;
    const parentId =
      params.parentId !== undefined ? params.parentId : existing.parentId;
    await this.assertParentForNamespace(namespace, parentId, existing.scopeKey);
    try {
      return await this.taxonomyRepo.updateTag(params.id, {
        key: params.key?.trim() ?? undefined,
        namespace: params.namespace ?? undefined,
        label: params.label?.trim() ?? undefined,
        sortOrder: params.sortOrder ?? undefined,
        parentId: params.parentId === null ? null : params.parentId ?? undefined,
        cropKind: params.cropKind === null ? null : params.cropKind ?? undefined,
        variantAxis:
          params.variantAxis === null
            ? null
            : params.variantAxis?.trim() ?? undefined,
        status: params.status ?? undefined,
      });
    } catch (error) {
      this.handleUniqueViolation(error, "TaxonomyTag key already exists");
    }
  }

  async delete(id: string) {
    const tag = await this.getById(id);
    if (tag.children.length > 0) {
      throw new BadRequestException(
        "Tag has child tags; use deleteTaxonomyGroup to remove a group",
      );
    }
    await this.taxonomyRepo.deleteTag(id);
    return true;
  }

  async deleteGroup(params: {
    id: string;
    strategy: TaxonomyGroupDeleteStrategy;
    newParentId?: string | null;
  }) {
    const group = await this.getById(params.id);
    const childIds = group.children.map(child => child.id);
    if (childIds.length === 0) {
      return this.delete(params.id);
    }

    if (params.strategy === "REASSIGN") {
      if (!params.newParentId) {
        throw new BadRequestException("newParentId is required for REASSIGN");
      }
      const newParent = await this.taxonomyRepo.findTagForParentCheck(params.newParentId);
      if (!newParent || newParent.scopeKey !== group.scopeKey) {
        throw new BadRequestException("newParentId must be a tag in the same scope");
      }
      if (params.newParentId === params.id) {
        throw new BadRequestException("newParentId cannot be the group being deleted");
      }
      await this.taxonomyRepo.updateChildrenParent(params.id, params.newParentId);
      await this.taxonomyRepo.deleteTag(params.id);
      return true;
    }

    if (params.strategy === "PROMOTE_TO_ROOT") {
      await this.taxonomyRepo.updateChildrenParent(params.id, null);
      await this.taxonomyRepo.deleteTag(params.id);
      return true;
    }

    if (params.strategy === "CASCADE") {
      await this.deleteSubtree(params.id);
      return true;
    }

    throw new BadRequestException("Unknown delete strategy");
  }

  private async deleteSubtree(rootId: string) {
    const children = await this.taxonomyRepo.findChildIds(rootId);
    for (const child of children) {
      await this.deleteSubtree(child.id);
    }
    await this.taxonomyRepo.deleteTag(rootId);
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

    const tags = await this.taxonomyRepo.findTagsByIds(taxonomyTagIds);
    if (tags.length !== taxonomyTagIds.length) {
      throw new BadRequestException("taxonomyTagIds: one or more tags not found");
    }

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
    const tags = await this.taxonomyRepo.findTagsByKeys(keys);
    const found = new Set(tags.map(tag => tag.key));
    const missing = keys.filter(key => !found.has(key));
    if (missing.length > 0) {
      throw new BadRequestException(
        `taxonomy tag keys not found: ${missing.join(", ")}`,
      );
    }
    return { set: tags.map(tag => ({ id: tag.id })) };
  }

  private toFlatTag(tag: {
    id: string;
    key: string;
    namespace: TaxonomyTagNamespace;
    label: string;
    sortOrder: number;
    parentId: string | null;
    cropKind: CropKind | null;
    variantAxis: string | null;
    status: TaxonomyTagStatus;
  }): FlatTaxonomyTag {
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

  private async resolveScopeKeyForNewTag(
    key: string,
    parentId: string | null,
  ): Promise<string> {
    if (parentId) {
      const parent = await this.taxonomyRepo.findTagScopeKey(parentId);
      if (!parent) {
        throw new BadRequestException("parentId not found");
      }
      return parent.scopeKey;
    }
    const prefix = key.split(".")[0];
    const scope = await this.taxonomyRepo.findScopeByKey(prefix);
    if (scope) {
      return scope.key;
    }
    throw new BadRequestException(
      "scopeKey is required when key prefix does not match a scope",
    );
  }

  private async assertScopeExists(scopeKey: string) {
    const scope = await this.taxonomyRepo.findScopeByKey(scopeKey);
    if (!scope) {
      throw new BadRequestException(`TaxonomyScope not found: ${scopeKey}`);
    }
  }

  private async assertParentForNamespace(
    namespace: TaxonomyTagNamespace,
    parentId: string | null,
    scopeKey: string,
  ) {
    if (namespace === TaxonomyTagNamespace.CROP_VARIANT) {
      if (!parentId) {
        throw new BadRequestException("parentId is required for CROP_VARIANT");
      }
      const parent = await this.taxonomyRepo.findTagForParentCheck(parentId);
      if (
        !parent ||
        parent.namespace !== TaxonomyTagNamespace.CROP ||
        parent.scopeKey !== scopeKey
      ) {
        throw new BadRequestException(
          "CROP_VARIANT parent must be a CROP tag in the same scope",
        );
      }
      return;
    }
    if (parentId) {
      const parent = await this.taxonomyRepo.findTagForParentCheck(parentId);
      if (!parent || parent.scopeKey !== scopeKey) {
        throw new BadRequestException("parent must be in the same scope");
      }
    }
  }

  private handleUniqueViolation(error: unknown, message: string): never {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new BadRequestException(message);
    }
    throw error;
  }
}
