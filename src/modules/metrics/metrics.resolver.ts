import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import type { MetricStatus } from "@prisma/client";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { MetricsService } from "./metrics.service";

type GqlRequest = Request & { user?: { userId?: string; role?: Role } };

type MetricParent = {
  id: string;
  locationMembers: Array<{ locationId: string; location: unknown }>;
  plantMembers: Array<{ plantId: string; plant: unknown }>;
};

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

function getUserContext(req: GqlRequest): { userId: string; role: Role } {
  const userId = req.user?.userId;
  const role = req.user?.role;
  if (!userId || role === undefined) {
    throw new Error("Missing user in request context");
  }
  return { userId, role };
}

@Resolver("Metric")
export class MetricsResolver {
  constructor(private readonly metricsService: MetricsService) {}

  @ResolveField("locationIds")
  locationIds(@Parent() metric: MetricParent): string[] {
    return metric.locationMembers.map((m) => m.locationId);
  }

  @ResolveField("plantIds")
  plantIds(@Parent() metric: MetricParent): string[] {
    return metric.plantMembers.map((m) => m.plantId);
  }

  @ResolveField("locations")
  locations(@Parent() metric: MetricParent) {
    return metric.locationMembers.map((m) => m.location);
  }

  @ResolveField("plants")
  plants(@Parent() metric: MetricParent) {
    return metric.plantMembers.map((m) => m.plant);
  }

  @ResolveField("projection")
  projection(@Context("req") req: GqlRequest, @Parent() metric: MetricParent) {
    return this.metricsService.buildProjection({
      userId: getUserIdFromReq(req),
      metricId: metric.id,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("metrics")
  metrics(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("status", { nullable: true }) status?: MetricStatus,
  ) {
    return this.metricsService.list({
      userId: getUserIdFromReq(req),
      limit,
      offset,
      status,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("metric")
  metric(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.metricsService.getById({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("metricActivity")
  metricActivity(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    return this.metricsService.listActivity({
      userId: getUserIdFromReq(req),
      metricId,
      limit,
      offset,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("metricWateringChart")
  metricWateringChart(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("from", { nullable: true }) from?: Date,
    @Args("to", { nullable: true }) to?: Date,
    @Args("limit", { nullable: true }) limit?: number,
  ) {
    return this.metricsService.buildWateringChart({
      userId: getUserIdFromReq(req),
      metricId,
      from,
      to,
      limit,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createMetric")
  createMetric(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      description?: string | null;
      status?: MetricStatus | null;
      displayPrefs?: unknown;
      locationIds?: string[] | null;
      plantIds?: string[] | null;
    },
  ) {
    return this.metricsService.create({
      userId: getUserIdFromReq(req),
      ...input,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("updateMetric")
  updateMetric(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      description?: string | null;
      status?: MetricStatus | null;
      displayPrefs?: unknown;
    },
  ) {
    return this.metricsService.update({
      userId: getUserIdFromReq(req),
      id,
      ...input,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("deleteMetric")
  deleteMetric(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.metricsService.delete({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("attachLocationsToMetric")
  attachLocationsToMetric(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("locationIds", { type: () => [String] }) locationIds: string[],
  ) {
    return this.metricsService.attachLocations({
      userId: getUserIdFromReq(req),
      metricId,
      locationIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("detachLocationsFromMetric")
  detachLocationsFromMetric(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("locationIds", { type: () => [String] }) locationIds: string[],
  ) {
    return this.metricsService.detachLocations({
      userId: getUserIdFromReq(req),
      metricId,
      locationIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("attachPlantsToMetric")
  attachPlantsToMetric(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("plantIds", { type: () => [String] }) plantIds: string[],
  ) {
    return this.metricsService.attachPlants({
      userId: getUserIdFromReq(req),
      metricId,
      plantIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("detachPlantsFromMetric")
  detachPlantsFromMetric(
    @Context("req") req: GqlRequest,
    @Args("metricId") metricId: string,
    @Args("plantIds", { type: () => [String] }) plantIds: string[],
  ) {
    return this.metricsService.detachPlants({
      userId: getUserIdFromReq(req),
      metricId,
      plantIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createPlantWithMetric")
  createPlantWithMetric(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      plantName: string;
      metricName?: string | null;
      metricDescription?: string | null;
      displayPrefs?: unknown;
      diaryId?: string | null;
      groupId?: string | null;
      actionPath?: string | null;
      payloadJson?: string | null;
    },
  ) {
    const { userId, role } = getUserContext(req);
    return this.metricsService.createPlantWithMetric({
      userId,
      userRole: role,
      ...input,
    });
  }
}

@Resolver("Plant")
export class MetricPlantFieldsResolver {
  constructor(private readonly metricsService: MetricsService) {}

  @ResolveField("metrics")
  metrics(@Context("req") req: GqlRequest, @Parent() plant: { id: string }) {
    return this.metricsService.listForPlant({
      userId: getUserIdFromReq(req),
      plantId: plant.id,
    });
  }
}

@Resolver("Event")
export class MetricEventFieldsResolver {
  @ResolveField("metricId")
  metricId(@Parent() event: { payload?: unknown }) {
    return extractMetricIdFromPayload(event.payload);
  }

  @ResolveField("metricIds")
  metricIds(@Parent() event: { payload?: unknown }): string[] {
    return extractMetricIdsFromPayload(event.payload);
  }
}

function extractMetricIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const metricId = (payload as Record<string, unknown>).metricId;
  return typeof metricId === "string" ? metricId : null;
}

function extractMetricIdsFromPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const metricIds = (payload as Record<string, unknown>).metricIds;
  if (!Array.isArray(metricIds)) {
    const single = extractMetricIdFromPayload(payload);
    return single ? [single] : [];
  }
  return metricIds.filter((id): id is string => typeof id === "string");
}
