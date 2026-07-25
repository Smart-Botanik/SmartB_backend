import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { AiRemoteService } from "./ai.remote-service";

@Resolver()
@UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
@Roles(Role.ADMIN)
export class AiResolver {
  constructor(private readonly ai: AiRemoteService) {}

  @Query("lunarFacts")
  lunarFacts(
    @Args("date") date: string,
    @Args("timezone", { nullable: true }) timezone?: string,
  ) {
    return this.ai.lunarFacts(date, timezone);
  }

  @Query("aiGeneration")
  aiGeneration(@Args("id") id: string) {
    return this.ai.aiGeneration(id);
  }

  @Query("aiGenerations")
  aiGenerations(
    @Args("kind", { nullable: true }) kind?: string,
    @Args("targetDate", { nullable: true }) targetDate?: string,
    @Args("status", { nullable: true }) status?: string,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    return this.ai.aiGenerations({ kind, targetDate, status, limit, offset });
  }

  @Mutation("generateLunarCalendarDayContent")
  generateLunarCalendarDayContent(
    @Args("input")
    input: {
      date: string;
      timezone?: string | null;
      notes?: string | null;
      locale?: string | null;
    },
  ) {
    return this.ai.generateLunarCalendarDayContent(input);
  }

  @Mutation("generateLunarCalendarDayContentBatch")
  generateLunarCalendarDayContentBatch(
    @Args("input")
    input: {
      from: string;
      to: string;
      timezone?: string | null;
      notes?: string | null;
      locale?: string | null;
      limit?: number | null;
    },
  ) {
    return this.ai.generateLunarCalendarDayContentBatch(input);
  }

  @Mutation("applyAiGenerationToCalendarDay")
  applyAiGenerationToCalendarDay(
    @Args("input")
    input: { generationId: string; asDraft?: boolean | null },
  ) {
    return this.ai.applyAiGenerationToCalendarDay(input);
  }

  @Mutation("discardAiGeneration")
  discardAiGeneration(@Args("id") id: string) {
    return this.ai.discardAiGeneration(id);
  }

  @Mutation("runLunarCalendarBackfill")
  runLunarCalendarBackfill(
    @Args("input")
    input: {
      from: string;
      to: string;
      timezone?: string | null;
      notes?: string | null;
      locale?: string | null;
      skipExisting?: boolean | null;
      autoApply?: boolean | null;
      limit?: number | null;
      dryRun?: boolean | null;
    },
  ) {
    return this.ai.runLunarCalendarBackfill(input);
  }
}
