import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type {
  LocationSubType,
  LocationType,
  LocationWateringType,
} from "@prisma/client";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import type { LocationSpecBlockInput } from "./locations.service";
import { LocationsService } from "./locations.service";

type GqlRequest = Request & { user?: { userId?: string } };

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

@Resolver("Location")
export class LocationsResolver {
  constructor(private readonly locationsService: LocationsService) {}

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
  @Mutation("createLocation")
  createLocation(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      status?: "active" | "archived" | null;
      type?: LocationType | null;
      subType?: LocationSubType | null;
      wateringType?: LocationWateringType | null;
      description?: string | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: LocationSpecBlockInput[] | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.create({
      userId,
      name: input.name,
      status: input.status,
      type: input.type,
      subType: input.subType,
      wateringType: input.wateringType,
      description: input.description,
      capacity: input.capacity,
      occupiedSlots: input.occupiedSlots,
      diaryIds: input.diaryIds,
      specBlocks: input.specBlocks,
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
      type?: LocationType | null;
      subType?: LocationSubType | null;
      wateringType?: LocationWateringType | null;
      description?: string | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: LocationSpecBlockInput[] | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.locationsService.update({
      userId,
      id,
      name: input.name,
      status: input.status,
      type: input.type,
      subType: input.subType,
      wateringType: input.wateringType,
      description: input.description,
      capacity: input.capacity,
      occupiedSlots: input.occupiedSlots,
      diaryIds: input.diaryIds,
      specBlocks: input.specBlocks,
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
