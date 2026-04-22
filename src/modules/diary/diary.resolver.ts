import { UseGuards } from "@nestjs/common";
import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import type { Request } from "express";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@growing/contracts";
import { DiaryService } from "./diary.service";

type GqlRequest = Request & { user?: { userId?: string } };

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

@Resolver("Diary")
export class DiaryResolver {
  constructor(private readonly diaryService: DiaryService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("diaries")
  diaries(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.list({ userId, limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("diary")
  diary(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.getById({ userId, id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createDiary")
  createDiary(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: { title?: string | null; body: string },
  ) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.create({
      userId,
      title: input.title ?? null,
      body: input.body,
    });
  }

  @ResolveField("plants")
  plants(@Context("req") req: GqlRequest, @Parent() diary: { id?: string }) {
    const userId = getUserIdFromReq(req);
    if (!diary?.id) return [];
    return this.diaryService.listPlants({ userId, diaryId: diary.id });
  }

  @ResolveField("locations")
  locations(@Context("req") req: GqlRequest, @Parent() diary: { id?: string }) {
    const userId = getUserIdFromReq(req);
    if (!diary?.id) return [];
    return this.diaryService.listLocationsForDiary({ userId, diaryId: diary.id });
  }

  @ResolveField("plantGroups")
  plantGroups(@Context("req") req: GqlRequest, @Parent() diary: { id?: string }) {
    const userId = getUserIdFromReq(req);
    if (!diary?.id) return [];
    return this.diaryService.listPlantGroups({ userId, diaryId: diary.id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("updateDiary")
  updateDiary(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input") input: { title?: string | null; body?: string | null },
  ) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.update({
      userId,
      id,
      title: input.title,
      body: input.body,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("deleteDiary")
  deleteDiary(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.delete({ userId, id });
  }
}
