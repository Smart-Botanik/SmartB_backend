import { UseGuards } from "@nestjs/common";
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
  @Mutation("createPlant")
  createPlant(
    @Context("req") req: GqlRequest,
    @Args("input") input: { name: string },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.create({ userId, name: input.name });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation("updatePlant")
  updatePlant(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input") input: { name?: string | null },
  ) {
    const userId = getUserIdFromReq(req);
    return this.plantService.update({ userId, id, name: input.name });
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
}
