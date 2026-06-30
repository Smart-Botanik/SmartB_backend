import { UseGuards } from "@nestjs/common";
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import {
  type CropKind,
  type TaxonomyTagNamespace,
  type TaxonomyTagStatus,
} from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import type { TaxonomyGroupDeleteStrategy } from "./taxonomy-tag.service";
import { TaxonomyTagService } from "./taxonomy-tag.service";
import { TaxonomyConsumerCatalogService } from "./taxonomy-consumer-catalog.service";

type TTaxonomyTagRecord = {
  id: string;
  children?: Array<{ id: string }>;
};

@Resolver("TaxonomyTag")
export class TaxonomyTagResolver {
  constructor(
    private readonly taxonomyTagService: TaxonomyTagService,
    private readonly taxonomyConsumerCatalogService: TaxonomyConsumerCatalogService,
  ) {}

  @ResolveField("childIds")
  childIds(@Parent() tag: TTaxonomyTagRecord) {
    return (tag.children ?? []).map(child => child.id);
  }

  @ResolveField("children")
  children(@Parent() tag: TTaxonomyTagRecord) {
    return tag.children ?? [];
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyScopes")
  taxonomyScopes() {
    return this.taxonomyTagService.listScopes();
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyTags")
  taxonomyTags(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("query", { nullable: true }) query?: string,
    @Args("scopeKey", { nullable: true }) scopeKey?: string,
    @Args("namespace", { nullable: true }) namespace?: TaxonomyTagNamespace,
    @Args("parentId", { nullable: true }) parentId?: string,
    @Args("cropKind", { nullable: true }) cropKind?: CropKind,
    @Args("status", { nullable: true }) status?: TaxonomyTagStatus,
  ) {
    return this.taxonomyTagService.list({
      limit,
      offset,
      query,
      scopeKey,
      namespace,
      parentId,
      cropKind,
      status: status ?? undefined,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyForest")
  taxonomyForest(
    @Args("scopeKey") scopeKey: string,
    @Args("status", { nullable: true }) status?: TaxonomyTagStatus,
  ) {
    return this.taxonomyTagService.forest(scopeKey, status ?? undefined);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyTag")
  taxonomyTag(@Args("id") id: string) {
    return this.taxonomyTagService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyTagsByKeys")
  taxonomyTagsByKeys(@Args("keys", { type: () => [String] }) keys: string[]) {
    return this.taxonomyTagService.tagsByKeys(keys);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("taxonomyConsumerCatalog")
  taxonomyConsumerCatalog(@Args("profile") profile: string) {
    return this.taxonomyConsumerCatalogService.getCatalog(profile);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createTaxonomyScope")
  createTaxonomyScope(
    @Args("input")
    input: {
      key: string;
      label: string;
      description?: string | null;
      sortOrder?: number | null;
    },
  ) {
    return this.taxonomyTagService.createScope(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createTaxonomyTag")
  createTaxonomyTag(
    @Args("input")
    input: {
      scopeKey?: string | null;
      key: string;
      namespace: TaxonomyTagNamespace;
      label: string;
      sortOrder?: number | null;
      parentId?: string | null;
      cropKind?: CropKind | null;
      variantAxis?: string | null;
      status?: TaxonomyTagStatus | null;
    },
  ) {
    return this.taxonomyTagService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateTaxonomyTag")
  updateTaxonomyTag(
    @Args("id") id: string,
    @Args("input")
    input: {
      key?: string | null;
      namespace?: TaxonomyTagNamespace | null;
      label?: string | null;
      sortOrder?: number | null;
      parentId?: string | null;
      cropKind?: CropKind | null;
      variantAxis?: string | null;
      status?: TaxonomyTagStatus | null;
    },
  ) {
    return this.taxonomyTagService.update({ id, ...input });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteTaxonomyTag")
  deleteTaxonomyTag(@Args("id") id: string) {
    return this.taxonomyTagService.delete(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteTaxonomyGroup")
  deleteTaxonomyGroup(
    @Args("id") id: string,
    @Args("strategy") strategy: TaxonomyGroupDeleteStrategy,
    @Args("newParentId", { nullable: true }) newParentId?: string,
  ) {
    return this.taxonomyTagService.deleteGroup({ id, strategy, newParentId });
  }
}
