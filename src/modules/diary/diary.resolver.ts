import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
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

  @UseGuards(GqlJwtAuthGuard)
  @Query("diaries")
  diaries(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.list({ userId, limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("diary")
  diary(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.getById({ userId, id });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("createDiary")
  createDiary(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: { plantId: string; title?: string | null; body: string },
  ) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.create({
      userId,
      plantId: input.plantId,
      title: input.title ?? null,
      body: input.body,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("deleteDiary")
  deleteDiary(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.diaryService.delete({ userId, id });
  }
}
