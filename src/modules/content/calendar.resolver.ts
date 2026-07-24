import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { ContentStatus } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { ContentService } from "./content.service";

@Resolver("CalendarDay")
export class CalendarResolver {
  constructor(private readonly contentService: ContentService) {}

  @Query("publishedCalendarDays")
  publishedCalendarDays(
    @Args("from") from: string,
    @Args("to") to: string,
    @Args("taxonomyTagIds", { nullable: true }) taxonomyTagIds?: string[],
    @Args("activityKind", { nullable: true }) activityKind?: string,
  ) {
    return this.contentService.listPublishedCalendarDays({
      from,
      to,
      taxonomyTagIds,
      activityKind,
    });
  }

  @Query("publishedCalendarDay")
  publishedCalendarDay(@Args("date") date: string) {
    return this.contentService.getPublishedCalendarDay(date);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("calendarDays")
  calendarDays(
    @Args("from") from: string,
    @Args("to") to: string,
    @Args("status", { nullable: true }) status?: ContentStatus,
    @Args("taxonomyTagIds", { nullable: true }) taxonomyTagIds?: string[],
    @Args("activityKind", { nullable: true }) activityKind?: string,
  ) {
    return this.contentService.listCalendarDays({
      from,
      to,
      status,
      taxonomyTagIds,
      activityKind,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("calendarDay")
  calendarDay(@Args("date") date: string) {
    return this.contentService.getCalendarDay(date);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertCalendarDay")
  upsertCalendarDay(
    @Args("input")
    input: {
      date: string;
      title?: string | null;
      bodyMd?: string | null;
      moonPhase?: string | null;
      moonZodiacSign?: string | null;
      generalState?: string | null;
      metaJson?: string | null;
      status?: ContentStatus | null;
      cultureMarks?: Array<{
        taxonomyTagId: string;
        activityKind: string;
        favorability: string;
        note?: string | null;
      }> | null;
    },
  ) {
    return this.contentService.upsertCalendarDay(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("publishCalendarDay")
  publishCalendarDay(@Args("date") date: string) {
    return this.contentService.publishCalendarDay(date);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("unpublishCalendarDay")
  unpublishCalendarDay(@Args("date") date: string) {
    return this.contentService.unpublishCalendarDay(date);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("setCalendarDayCultureMarks")
  setCalendarDayCultureMarks(
    @Args("date") date: string,
    @Args("marks")
    marks: Array<{
      taxonomyTagId: string;
      activityKind: string;
      favorability: string;
      note?: string | null;
    }>,
  ) {
    return this.contentService.setCalendarDayCultureMarks(date, marks);
  }
}
