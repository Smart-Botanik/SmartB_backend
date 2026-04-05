import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { EventsService } from "./events.service";

type GqlRequest = Request & { user?: { userId?: string } };

@Resolver()
export class EventsResolver {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("events")
  events(
    @Context("req") _req: GqlRequest,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("targetType", { nullable: true }) targetType?: string,
    @Args("targetId", { nullable: true }) targetId?: string,
    @Args("actionPath", { nullable: true }) actionPath?: string,
    @Args("isSystem", { nullable: true }) isSystem?: boolean,
  ) {
    return this.eventsService.listEvents({
      limit,
      offset,
      targetType,
      targetId,
      actionPath,
      isSystem,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  @Mutation("upsertActionPathRegistry")
  upsertActionPathRegistry(
    @Context("req") _req: GqlRequest,
    @Args("actionPath") actionPath: string,
    @Args("targetType") targetType: string,
    @Args("mappingJson") mappingJson: string,
    @Args("conditionsJson", { nullable: true }) conditionsJson?: string,
    @Args("tagId", { nullable: true }) tagId?: string,
  ) {
    return this.eventsService.upsertRegistry({
      actionPath,
      targetType,
      mappingJson,
      conditionsJson,
      tagId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createPlantEvent")
  createPlantEvent(
    @Context("req") _req: GqlRequest,
    @Args("plantId") plantId: string,
    @Args("actionPath") actionPath: string,
    @Args("payloadJson") payloadJson: string,
  ) {
    return this.eventsService.createPlantEvent({
      plantId,
      actionPath,
      payloadJson,
    });
  }
}
