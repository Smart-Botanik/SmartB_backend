import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { EventsService } from "./events.service";

type GqlRequest = Request & { user?: { userId?: string; role?: Role } };

function getUserContext(req: GqlRequest): { userId: string; role: Role } {
  const userId = req.user?.userId;
  const role = req.user?.role;
  if (!userId || role === undefined) {
    throw new Error("Missing user in request context");
  }
  return { userId, role };
}

@Resolver()
export class EventsResolver {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Query("events")
  events(
    @Context("req") req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("targetType", { nullable: true }) targetType?: string,
    @Args("targetId", { nullable: true }) targetId?: string,
    @Args("actionPath", { nullable: true }) actionPath?: string,
    @Args("isSystem", { nullable: true }) isSystem?: boolean,
  ) {
    const { userId, role } = getUserContext(req);
    return this.eventsService.listEvents({
      userId,
      userRole: role,
      limit,
      offset,
      targetType,
      targetId,
      actionPath,
      isSystem,
    });
  }

  /**
   * Чтение реестра для клиентского auto-tag (`autoTagRules` + mapping).
   * Мутации registry остаются только у ADMIN.
   */
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Query("actionPathRegistries")
  actionPathRegistries(
    @Context("req") _req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("targetType", { nullable: true }) targetType?: string,
  ) {
    return this.eventsService.listRegistries({ limit, offset, targetType });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Query("actionPathRegistry")
  actionPathRegistry(
    @Context("req") _req: GqlRequest,
    @Args("actionPath") actionPath: string,
  ) {
    return this.eventsService.getRegistryByActionPath(actionPath);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Query("actionPathRegistryGroups")
  actionPathRegistryGroups(@Context("req") _req: GqlRequest) {
    return this.eventsService.listRegistryGroups();
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertActionPathRegistry")
  upsertActionPathRegistry(
    @Context("req") _req: GqlRequest,
    @Args("actionPath") actionPath: string,
    @Args("targetType") targetType: string,
    @Args("mappingJson") mappingJson: string,
    @Args("conditionsJson", { nullable: true }) conditionsJson?: string,
    @Args("autoTagRulesJson", { nullable: true }) autoTagRulesJson?: string,
    @Args("schemaJson", { nullable: true }) schemaJson?: string,
    @Args("tagId", { nullable: true }) tagId?: string,
    @Args("description", { nullable: true }) description?: string,
  ) {
    return this.eventsService.upsertRegistry({
      actionPath,
      targetType,
      mappingJson,
      conditionsJson,
      autoTagRulesJson,
      schemaJson,
      tagId,
      description,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createActionPathRegistryGroup")
  createActionPathRegistryGroup(
    @Context("req") _req: GqlRequest,
    @Args("path") path: string,
    @Args("description", { nullable: true }) description?: string,
  ) {
    return this.eventsService.createRegistryGroup({ path, description });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateActionPathRegistryGroup")
  updateActionPathRegistryGroup(
    @Context("req") _req: GqlRequest,
    @Args("id") id: string,
    @Args("path", { nullable: true }) path?: string,
    @Args("description", { nullable: true }) description?: string,
  ) {
    return this.eventsService.updateRegistryGroup({ id, path, description });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateActionPathRegistriesOrder")
  updateActionPathRegistriesOrder(
    @Context("req") _req: GqlRequest,
    @Args("input")
    input: Array<{
      id: string;
      groupId?: string | null;
      position: number;
    }>,
  ) {
    return this.eventsService.updateActionPathRegistriesOrder(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateActionPathRegistryGroupsOrder")
  updateActionPathRegistryGroupsOrder(
    @Context("req") _req: GqlRequest,
    @Args("input")
    input: Array<{
      id: string;
      order: number;
    }>,
  ) {
    return this.eventsService.updateActionPathRegistryGroupsOrder(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Mutation("createPlantEvent")
  createPlantEvent(
    @Context("req") req: GqlRequest,
    @Args("plantId") plantId: string,
    @Args("actionPath") actionPath: string,
    @Args("payloadJson") payloadJson: string,
  ) {
    const { userId, role } = getUserContext(req);
    return this.eventsService.createPlantEvent({
      userId,
      userRole: role,
      plantId,
      actionPath,
      payloadJson,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createLocationEvent")
  createLocationEvent(
    @Context("req") _req: GqlRequest,
    @Args("locationId") locationId: string,
    @Args("actionPath") actionPath: string,
    @Args("payloadJson") payloadJson: string,
  ) {
    return this.eventsService.createLocationEvent({
      locationId,
      actionPath,
      payloadJson,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Mutation("createDiaryEvent")
  createDiaryEvent(
    @Context("req") req: GqlRequest,
    @Args("diaryId") diaryId: string,
    @Args("actionPath") actionPath: string,
    @Args("payloadJson") payloadJson: string,
  ) {
    const { userId, role } = getUserContext(req);
    return this.eventsService.createDiaryEvent({
      userId,
      userRole: role,
      diaryId,
      actionPath,
      payloadJson,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("rebuildPlantProjection")
  rebuildPlantProjection(
    @Context("req") _req: GqlRequest,
    @Args("plantId") plantId: string,
    @Args("asOf", { nullable: true }) asOf?: Date,
  ) {
    return this.eventsService.rebuildPlantProjection({ plantId, asOf });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createPlantSnapshot")
  createPlantSnapshot(
    @Context("req") _req: GqlRequest,
    @Args("plantId") plantId: string,
    @Args("asOf", { nullable: true }) asOf?: Date,
  ) {
    return this.eventsService.createPlantSnapshot({ plantId, asOf });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("rebuildLocationProjection")
  rebuildLocationProjection(
    @Context("req") _req: GqlRequest,
    @Args("locationId") locationId: string,
    @Args("asOf", { nullable: true }) asOf?: Date,
  ) {
    return this.eventsService.rebuildLocationProjection({ locationId, asOf });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createLocationSnapshot")
  createLocationSnapshot(
    @Context("req") _req: GqlRequest,
    @Args("locationId") locationId: string,
    @Args("asOf", { nullable: true }) asOf?: Date,
  ) {
    return this.eventsService.createLocationSnapshot({ locationId, asOf });
  }
}
