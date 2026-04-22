import { UseGuards } from "@nestjs/common";
import { PlantGroupStatus } from "@prisma/client";
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import type { Request } from "express";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { EventsService } from "../events/events.service";
import { locationGraphqlInclude } from "../locations/locations.service";
import { PlantService } from "./plant.service";

type GqlRequest = Request & { user?: { userId?: string } };

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

@Resolver("Plant")
export class PlantResolver {
  constructor(
    private readonly plantService: PlantService,
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query("plants")
  plants(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.list({ userId, limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("plant")
  plant(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.plantService.getById({ userId, id });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("plantAt")
  async plantAt(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("asOf") asOf: Date,
  ) {
    const userId = getUserIdFromReq(req);
    const plant = await this.plantService.getById({ userId, id });
    const replayedState = await this.eventsService.replayPlantStateAt(id, asOf);
    return {
      ...plant,
      current: replayedState,
    };
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("createPlant")
  createPlant(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      diaryId?: string | null;
      locationId?: string | null;
      groupId?: string | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.createWithRelations({
      userId,
      name: input.name,
      diaryId: input.diaryId,
      locationId: input.locationId,
      groupId: input.groupId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("createPlants")
  createPlants(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      count: number;
      diaryId?: string | null;
      locationId?: string | null;
      groupId?: string | null;
    },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.createPlants({
      userId,
      name: input.name,
      count: input.count,
      diaryId: input.diaryId,
      locationId: input.locationId,
      groupId: input.groupId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("plantGroups")
  plantGroups(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.listGroups({ userId, limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query("plantGroup")
  plantGroup(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.plantService.getGroupById({ userId, id });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("createPlantGroup")
  createPlantGroup(
    @Context("req") req: GqlRequest,
    @Args("input") input: { name: string; diaryId?: string | null; count?: number | null },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.createGroup({
      userId,
      name: input.name,
      diaryId: input.diaryId,
      count: input.count,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("updatePlantGroup")
  updatePlantGroup(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input")
    input: { name?: string | null; diaryId?: string | null; status?: PlantGroupStatus | null },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.updateGroup({
      userId,
      id,
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.diaryId !== undefined ? { diaryId: input.diaryId } : {}),
      ...(input.status !== undefined && input.status !== null ? { status: input.status } : {}),
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("updatePlant")
  updatePlant(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input") input: { name?: string | null; diaryId?: string | null },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.update({
      userId,
      id,
      name: input.name,
      diaryId: input.diaryId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("deletePlant")
  deletePlant(@Context("req") req: GqlRequest, @Args("id") id: string) {
    const userId = getUserIdFromReq(req);
    return this.plantService.delete({ userId, id });
  }

  @ResolveField("location")
  location(@Parent() plant: { locationId?: string | null }) {
    if (!plant.locationId) {
      return null;
    }
    return this.prisma.location.findUnique({
      where: { id: plant.locationId },
      include: locationGraphqlInclude,
    });
  }

  @ResolveField("group")
  group(@Parent() plant: { groupId?: string | null }) {
    if (!plant.groupId) {
      return null;
    }
    return this.prisma.plantGroup.findUnique({
      where: { id: plant.groupId },
    });
  }

  @ResolveField("groupId")
  groupId(@Parent() plant: { groupId?: string | null }) {
    return plant.groupId ?? null;
  }
}

@Resolver("PlantGroup")
export class PlantGroupResolver {
  constructor(private readonly plantService: PlantService) {}

  @UseGuards(GqlJwtAuthGuard)
  @ResolveField("plants")
  plantsForGroup(@Context("req") req: GqlRequest, @Parent() group: { id?: string }) {
    const userId = getUserIdFromReq(req);
    if (!group?.id) return [];
    return this.plantService.listPlantsForGroup({ userId, groupId: group.id });
  }
}
