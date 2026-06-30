import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type {
  CultivationUnitPlacementRole,
  LocationSubType,
  LocationType,
  Prisma,
} from "@prisma/client";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import type { CultivationUnitSpecBlockInput } from "./cultivation-units.service";
import { CultivationUnitsService } from "./cultivation-units.service";

type GqlRequest = Request & { user?: { userId?: string } };

function getUserIdFromReq(req: GqlRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Missing user in request context");
  }
  return userId;
}

/**
 * Legacy CultivationUnit API — sunset REW-03 (ADR-0013).
 * Resolvers remain for dual-read; schema fields marked @deprecated.
 * Prefer locations module + FE adapter (FE-API-REW-1c).
 */
@Resolver("CultivationUnit")
export class CultivationUnitsResolver {
  constructor(private readonly cultivationUnitsService: CultivationUnitsService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("cultivationUnits")
  cultivationUnits(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
  ) {
    return this.cultivationUnitsService.list({ userId: getUserIdFromReq(req), limit, offset });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Query("cultivationUnit")
  cultivationUnit(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.cultivationUnitsService.getById({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createCultivationUnit")
  createCultivationUnit(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      name: string;
      primaryLocationId?: string | null;
      status?: "active" | "archived" | null;
      type?: LocationType | null;
      subType?: LocationSubType | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: CultivationUnitSpecBlockInput[] | null;
      additionalLocationIds?: string[] | null;
    },
  ) {
    return this.cultivationUnitsService.create({
      userId: getUserIdFromReq(req),
      ...input,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("updateCultivationUnit")
  updateCultivationUnit(
    @Context("req") req: GqlRequest,
    @Args("id") id: string,
    @Args("input")
    input: {
      name?: string | null;
      status?: "active" | "archived" | null;
      type?: LocationType | null;
      subType?: LocationSubType | null;
      capacity?: number | null;
      occupiedSlots?: number | null;
      diaryIds?: string[] | null;
      specBlocks?: CultivationUnitSpecBlockInput[] | null;
      current?: Prisma.InputJsonValue | null;
    },
  ) {
    return this.cultivationUnitsService.update({
      userId: getUserIdFromReq(req),
      id,
      ...input,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("createCultivationUnitEvent")
  createCultivationUnitEvent(
    @Context("req") req: GqlRequest,
    @Args("cultivationUnitId") cultivationUnitId: string,
    @Args("actionPath") actionPath: string,
    @Args("payloadJson") payloadJson: string,
  ) {
    return this.cultivationUnitsService.createEvent({
      userId: getUserIdFromReq(req),
      cultivationUnitId,
      actionPath,
      payloadJson,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("deleteCultivationUnit")
  deleteCultivationUnit(@Context("req") req: GqlRequest, @Args("id") id: string) {
    return this.cultivationUnitsService.delete({ userId: getUserIdFromReq(req), id });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("addCultivationUnitPlacement")
  addCultivationUnitPlacement(
    @Context("req") req: GqlRequest,
    @Args("input")
    input: {
      cultivationUnitId: string;
      locationId: string;
      role?: CultivationUnitPlacementRole;
      sortOrder?: number;
    },
  ) {
    return this.cultivationUnitsService.addPlacement({
      userId: getUserIdFromReq(req),
      ...input,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("removeCultivationUnitPlacement")
  removeCultivationUnitPlacement(
    @Context("req") req: GqlRequest,
    @Args("cultivationUnitId") cultivationUnitId: string,
    @Args("locationId") locationId: string,
  ) {
    return this.cultivationUnitsService.removePlacement({
      userId: getUserIdFromReq(req),
      cultivationUnitId,
      locationId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @Mutation("setCultivationUnitPrimaryLocation")
  setCultivationUnitPrimaryLocation(
    @Context("req") req: GqlRequest,
    @Args("cultivationUnitId") cultivationUnitId: string,
    @Args("locationId") locationId: string,
  ) {
    return this.cultivationUnitsService.setPrimaryLocation({
      userId: getUserIdFromReq(req),
      cultivationUnitId,
      locationId,
    });
  }
}
