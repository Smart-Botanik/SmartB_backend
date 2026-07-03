import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import type {
  LocationSubType,
  LocationType,
  LocationWateringType,
  SeatLayoutMode,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { EventsService } from "../events/events.service";
import type { LocationSpecBlockInput } from "./locations.service";
import { LocationsService } from "./locations.service";
import { LocationGroupsService } from "./location-groups.service";
import type { CreateSeatInput } from "./seat.util";

type GqlRequest = Request & { user?: { userId?: string } };

type LocationParent = {
  id: string;
  occupiedCount?: number;
  seats?: unknown[];
  taxonomyTags?: Array<{ taxonomyTagId: string }>;
};

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

@Resolver("Location")
export class LocationsResolver {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly locationGroupsService: LocationGroupsService,
    private readonly eventsService: EventsService,
  ) {}

  @ResolveField("taxonomyTagIds")
  taxonomyTagIds(@Parent() location: LocationParent): string[] {
    return (location.taxonomyTags ?? []).map((row) => row.taxonomyTagId);
  }

  @ResolveField("seats")
  seats(@Parent() location: LocationParent) {
    return location.seats ?? [];
  }

  @ResolveField("occupiedCount")
  occupiedCount(@Parent() location: LocationParent) {
    return this.locationsService.computeOccupiedCount(location.id);
  }

  @ResolveField("locationGroups")
  locationGroups(@Context("req") req: GqlRequest, @Parent() location: LocationParent) {
    return this.locationGroupsService.listForLocation({
      userId: getUserIdFromReq(req),
      locationId: location.id,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("locations")
  locations(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.list({ userId, limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("location")
  location(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.getById({ userId, id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("locationAt")
  async locationAt(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("asOf") asOf: Date,
  ) {
    const userId = getUserIdFromReq(req);
    const location = await this.locationsService.getById({ userId, id });
    const replayedState = await this.eventsService.replayLocationStateAt(id, asOf);
    return {
      ...location,
      current: replayedState,
    };
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createLocation")
  createLocation(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      status?: "active" | "archived" | null;
      environmentTagId?: string | null;
      dimensions?: Prisma.InputJsonValue | null;
      seatLayoutMode?: SeatLayoutMode | null;
      layoutMeta?: Prisma.InputJsonValue | null;
      taxonomyTagIds?: string[] | null;
      type?: LocationType | null;
      subType?: LocationSubType | null;
      wateringType?: LocationWateringType | null;
      description?: string | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: LocationSpecBlockInput[] | null;
      seats?: CreateSeatInput[] | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.create({
      userId,
      name: input.name,
      status: input.status,
      environmentTagId: input.environmentTagId,
      dimensions: input.dimensions,
      seatLayoutMode: input.seatLayoutMode,
      layoutMeta: input.layoutMeta,
      taxonomyTagIds: input.taxonomyTagIds,
      type: input.type,
      subType: input.subType,
      wateringType: input.wateringType,
      description: input.description,
      capacity: input.capacity,
      occupiedSlots: input.occupiedSlots,
      diaryIds: input.diaryIds,
      specBlocks: input.specBlocks,
      seats: input.seats,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("updateLocation")
  updateLocation(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      status?: "active" | "archived" | null;
      environmentTagId?: string | null;
      dimensions?: Prisma.InputJsonValue | null;
      seatLayoutMode?: SeatLayoutMode | null;
      layoutMeta?: Prisma.InputJsonValue | null;
      taxonomyTagIds?: string[] | null;
      type?: LocationType | null;
      subType?: LocationSubType | null;
      wateringType?: LocationWateringType | null;
      description?: string | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: LocationSpecBlockInput[] | null;
      seats?: CreateSeatInput[] | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.update({
      userId,
      id,
      name: input.name,
      status: input.status,
      environmentTagId: input.environmentTagId,
      dimensions: input.dimensions,
      seatLayoutMode: input.seatLayoutMode,
      layoutMeta: input.layoutMeta,
      taxonomyTagIds: input.taxonomyTagIds,
      type: input.type,
      subType: input.subType,
      wateringType: input.wateringType,
      description: input.description,
      capacity: input.capacity,
      occupiedSlots: input.occupiedSlots,
      diaryIds: input.diaryIds,
      specBlocks: input.specBlocks,
      seats: input.seats,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("deleteLocation")
  deleteLocation(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.delete({ userId, id });
  }
}
