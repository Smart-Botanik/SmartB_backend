import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { LocationGroupsService } from "./location-groups.service";

type GqlRequest = Request & { user?: { userId?: string } };

type LocationGroupParent = {
  members: Array<{ locationId: string; location: unknown }>;
};

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

@Resolver("LocationGroup")
export class LocationGroupsResolver {
  constructor(private readonly locationGroupsService: LocationGroupsService) {}

  @ResolveField("locationIds")
  locationIds(@Parent() group: LocationGroupParent): string[] {
    return group.members.map((m) => m.locationId);
  }

  @ResolveField("locations")
  locations(@Parent() group: LocationGroupParent) {
    return group.members.map((m) => m.location);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("locationGroups")
  locationGroups(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    return this.locationGroupsService.list({
      userId: getUserIdFromReq(req),
      limit,
      offset,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("locationGroup")
  locationGroup(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.locationGroupsService.getById({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createLocationGroup")
  createLocationGroup(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: { name: string; description?: string | null; locationIds?: string[] | null },
  ) {
    return this.locationGroupsService.create({
      userId: getUserIdFromReq(req),
      name: input.name,
      description: input.description,
      locationIds: input.locationIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("updateLocationGroup")
  updateLocationGroup(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input") input: { name?: string | null; description?: string | null },
  ) {
    return this.locationGroupsService.update({
      userId: getUserIdFromReq(req),
      id,
      name: input.name,
      description: input.description,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("deleteLocationGroup")
  deleteLocationGroup(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.locationGroupsService.delete({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("attachLocationsToGroup")
  attachLocationsToGroup(
    @Context("req") req: GqlRequest,
    @Args("groupId") groupId: string,
    @Args("locationIds", { type: () => [String] }) locationIds: string[],
  ) {
    return this.locationGroupsService.attachLocations({
      userId: getUserIdFromReq(req),
      groupId,
      locationIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("detachLocationsFromGroup")
  detachLocationsFromGroup(
    @Context("req") req: GqlRequest,
    @Args("groupId") groupId: string,
    @Args("locationIds", { type: () => [String] }) locationIds: string[],
  ) {
    return this.locationGroupsService.detachLocations({
      userId: getUserIdFromReq(req),
      groupId,
      locationIds,
    });
  }
}
