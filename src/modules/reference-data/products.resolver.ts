import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { ProductsService } from "./products.service";

@Resolver("Product")
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query("products")
  products(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("query", { nullable: true }) query?: string,
    @Args("category", { nullable: true }) category?: string,
    @Args("brandId", { nullable: true }) brandId?: string,
  ) {
    return this.productsService.list({ limit, offset, query, category, brandId });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("product")
  product(@Args("id") id: string) {
    return this.productsService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createProduct")
  createProduct(
    @Args("input")
    input: {
      name: string;
      category: string;
      brandId: string;
      avatarMediaId?: string | null;
      taxonomyTagIds?: string[] | null;
    },
  ) {
    return this.productsService.create({
      name: input.name,
      category: input.category,
      brandId: input.brandId,
      avatarMediaId: input.avatarMediaId,
      taxonomyTagIds: input.taxonomyTagIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateProduct")
  updateProduct(
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      category?: string | null;
      brandId?: string | null;
      avatarMediaId?: string | null;
      taxonomyTagIds?: string[] | null;
    },
  ) {
    return this.productsService.update({
      id,
      name: input.name,
      category: input.category,
      brandId: input.brandId,
      avatarMediaId: input.avatarMediaId,
      taxonomyTagIds: input.taxonomyTagIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteProduct")
  deleteProduct(@Args("id") id: string) {
    return this.productsService.delete(id);
  }
}
