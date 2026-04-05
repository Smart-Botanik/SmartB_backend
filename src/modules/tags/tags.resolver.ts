import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { TagsService } from "./tags.service";

@Resolver("Tag")
export class TagsResolver {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("tags")
  tags(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("query", { nullable: true }) query?: string,
    @Args("category", { nullable: true }) category?: string,
    @Args("targetType", { nullable: true }) targetType?: string,
  ) {
    return this.tagsService.list({
      limit,
      offset,
      query,
      category,
      targetType,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("tag")
  tag(@Args("id") id: string) {
    return this.tagsService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createTag")
  createTag(
    @Args("label") label: string,
    @Args("targetType", { nullable: true }) targetType?: string,
    @Args("color", { nullable: true }) color?: string,
    @Args("icon", { nullable: true }) icon?: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    return this.tagsService.create({
      label,
      targetType,
      color,
      icon,
      category,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateTag")
  updateTag(
    @Args("id") id: string,
    @Args("label", { nullable: true }) label?: string,
    @Args("targetType", { nullable: true }) targetType?: string | null,
    @Args("color", { nullable: true }) color?: string | null,
    @Args("icon", { nullable: true }) icon?: string | null,
    @Args("category", { nullable: true }) category?: string | null,
  ) {
    return this.tagsService.update({
      id,
      label,
      targetType,
      color,
      icon,
      category,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteTag")
  deleteTag(@Args("id") id: string) {
    return this.tagsService.delete(id);
  }
}
