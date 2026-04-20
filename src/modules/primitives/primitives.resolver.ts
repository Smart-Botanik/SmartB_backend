import { BadRequestException, UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { PrimitiveStatus, PrimitiveValueType } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { PrimitivesService } from "./primitives.service";

@Resolver("Primitive")
export class PrimitivesResolver {
  constructor(private readonly primitivesService: PrimitivesService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("primitives")
  primitives() {
    return this.primitivesService.list();
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("primitive")
  primitive(@Args("id") id: string) {
    return this.primitivesService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createPrimitive")
  createPrimitive(
    @Args("key") key: string,
    @Args("name") name: string,
    @Args("valueType") valueType: PrimitiveValueType,
    @Args("unit", { nullable: true }) unit?: string,
    @Args("validationJson", { nullable: true }) validationJson?: string,
  ) {
    return this.primitivesService.create({
      key,
      name,
      valueType,
      unit,
      validation: parseValidationJson(validationJson),
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updatePrimitive")
  updatePrimitive(
    @Args("id") id: string,
    @Args("key", { nullable: true }) key?: string,
    @Args("name", { nullable: true }) name?: string,
    @Args("valueType", { nullable: true }) valueType?: PrimitiveValueType,
    @Args("unit", { nullable: true }) unit?: string,
    @Args("validationJson", { nullable: true }) validationJson?: string,
    @Args("status", { nullable: true }) status?: PrimitiveStatus,
  ) {
    return this.primitivesService.update(id, {
      key,
      name,
      valueType,
      unit,
      validation: parseValidationJson(validationJson),
      status,
    });
  }
}

function parseValidationJson(validationJson?: string) {
  if (!validationJson?.trim()) return undefined;
  try {
    return JSON.parse(validationJson);
  } catch {
    throw new BadRequestException("validationJson must be valid JSON");
  }
}
