import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { BrandsService } from "./brands.service";
import { BrandCategory } from "@prisma/client";

@Resolver("Brand")
export class BrandsResolver {
  constructor(private readonly brandsService: BrandsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query("brands")
  brands(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("query", { nullable: true }) query?: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    // Convert string category to enum if provided
    let categoryEnum: BrandCategory | null = null;
    if (category) {
      // Map frontend string values to backend enum values
      const categoryMap: Record<string, BrandCategory> = {
        breader: BrandCategory.BREADER,
        tent: BrandCategory.TENT,
        lamp: BrandCategory.LAMP,
        common: BrandCategory.COMMON,
      };
      categoryEnum = categoryMap[category.toLowerCase()] || null;
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("createBrand")
  createBrand(
    @Args("input")
    input: {
      name: string;
      category: BrandCategory;
      avatarMediaId?: string | null;
    },
  ) {
    return this.brandsService.create({
      name: input.name,
      category: input.category,
      avatarMediaId: input.avatarMediaId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("updateBrand")
  updateBrand(
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      category?: BrandCategory | null;
      summarize?: string | null;
      avatarMediaId?: string | null;
    },
  ) {
    return this.brandsService.update({
      id,
      name: input.name,
      category: input.category,
      summarize: input.summarize,
      avatarMediaId: input.avatarMediaId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("deleteBrand")
  deleteBrand(@Args("id") id: string) {
    return this.brandsService.delete(id);
  }
}
