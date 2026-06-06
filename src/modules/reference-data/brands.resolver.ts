import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { BrandsService } from "./brands.service";
import type { BrandCategoryValue } from "./reference-data.types";

@Resolver("Brand")
export class BrandsResolver {
  constructor(private readonly brandsService: BrandsService) {}

  /** Каталог брендов: только для аутентифицированных пользователей (любая роль). */
  @UseGuards(GqlJwtAuthGuard)
  @Query("brands")
  brands(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("query", { nullable: true }) query?: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    let categoryEnum: BrandCategoryValue | null = null;
    if (category) {
      const raw = category.trim();
      const lower = raw.toLowerCase();
      const categoryMap: Record<string, BrandCategoryValue> = {
        breader: "BREADER",
        tent: "TENT",
        lamp: "LAMP",
        common: "COMMON",
        BREADER: "BREADER",
        TENT: "TENT",
        LAMP: "LAMP",
        COMMON: "COMMON",
      };
      categoryEnum = categoryMap[raw] ?? categoryMap[lower] ?? null;
    }

    return this.brandsService.list({
      limit,
      offset,
      query,
      category: categoryEnum,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("brand")
  brand(@Args("id") id: string) {
    return this.brandsService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createBrand")
  createBrand(
    @Args("input")
    input: {
      name: string;
      category: string;
      description?: string | null;
      avatarMediaId?: string | null;
    },
  ) {
    return this.brandsService.create({
      name: input.name,
      category: input.category,
      description: input.description,
      avatarMediaId: input.avatarMediaId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateBrand")
  updateBrand(
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      category?: string | null;
      description?: string | null;
      avatarMediaId?: string | null;
    },
  ) {
    return this.brandsService.update({
      id,
      name: input.name,
      category: input.category ?? undefined,
      description: input.description,
      avatarMediaId: input.avatarMediaId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteBrand")
  deleteBrand(@Args("id") id: string) {
    return this.brandsService.delete(id);
  }
}
