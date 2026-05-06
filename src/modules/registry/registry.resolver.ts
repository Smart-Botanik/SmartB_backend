import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import {
  RegistryFieldSpecStatus,
  RegistryProfileKind,
  RegistrySemanticKind,
  RegistryValueType,
} from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { RegistryService } from "./registry.service";

type TUpsertRegistryFieldSpecArgs = {
  fieldId: string;
  entity: string;
  label: string;
  valueType: RegistryValueType;
  semanticKind?: RegistrySemanticKind;
  unit?: string;
  canonicalPath: string;
  required?: boolean;
  formatJson?: unknown;
  constraintsJson?: unknown;
  fieldPatternKey?: string;
  includeInCurrent?: boolean;
  status?: RegistryFieldSpecStatus;
};

type TUpsertRegistryFieldPatternArgs = {
  key: string;
  title: string;
  valueType: RegistryValueType;
  semanticKind?: RegistrySemanticKind;
  canonicalUnit?: string;
  allowedUnits?: string[];
  defaultInputUnit?: string;
  conversionProfile?: string;
  formatJson?: unknown;
  constraintsJson?: unknown;
  isActive?: boolean;
};

type TUpsertRegistryProfileArgs = {
  key: string;
  entity: string;
  kind: RegistryProfileKind;
  title: string;
  description?: string;
  isActive?: boolean;
};

type TSetRegistryProfileFieldsArgs = {
  profileKey: string;
  fieldIds: string[];
  requiredFieldIds?: string[];
};

type TToggleRegistryFieldCurrentArgs = {
  fieldId: string;
  includeInCurrent: boolean;
};

type TRegistryBuildPreviewArgs = {
  profileKey: string;
  valuesJson: Record<string, unknown>;
};

@Resolver("RegistryFieldSpec")
export class RegistryResolver {
  constructor(private readonly registryService: RegistryService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("registryFieldSpecs")
  registryFieldSpecs(
    @Args("entity", { nullable: true }) entity?: string,
    @Args("status", { nullable: true }) status?: RegistryFieldSpecStatus,
  ) {
    return this.registryService.listFieldSpecs({ entity, status });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("registryFieldPatterns")
  registryFieldPatterns(
    @Args("isActive", { nullable: true }) isActive?: boolean,
  ) {
    return this.registryService.listFieldPatterns({ isActive });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("registryProfiles")
  registryProfiles(
    @Args("entity", { nullable: true }) entity?: string,
    @Args("kind", { nullable: true }) kind?: RegistryProfileKind,
    @Args("isActive", { nullable: true }) isActive?: boolean,
  ) {
    return this.registryService.listProfiles({ entity, kind, isActive });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("registryProfile")
  registryProfile(@Args("key") key: string) {
    return this.registryService.getProfileByKey(key);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("registryBuildPreview")
  registryBuildPreview(@Args("input") input: TRegistryBuildPreviewArgs) {
    return this.registryService.buildPreview({
      profileKey: input.profileKey,
      valuesJson: input.valuesJson,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertRegistryFieldPattern")
  upsertRegistryFieldPattern(
    @Args("input") input: TUpsertRegistryFieldPatternArgs,
  ) {
    return this.registryService.upsertFieldPattern({
      key: input.key,
      title: input.title,
      valueType: input.valueType,
      semanticKind: input.semanticKind,
      canonicalUnit: input.canonicalUnit,
      allowedUnits: input.allowedUnits,
      defaultInputUnit: input.defaultInputUnit,
      conversionProfile: input.conversionProfile,
      formatJson: input.formatJson as never,
      constraintsJson: input.constraintsJson as never,
      isActive: input.isActive,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertRegistryFieldSpec")
  upsertRegistryFieldSpec(
    @Args("input") input: TUpsertRegistryFieldSpecArgs,
  ) {
    return this.registryService.upsertFieldSpec({
      fieldId: input.fieldId,
      entity: input.entity,
      label: input.label,
      valueType: input.valueType,
      semanticKind: input.semanticKind,
      unit: input.unit,
      canonicalPath: input.canonicalPath,
      required: input.required,
      formatJson: input.formatJson as never,
      constraintsJson: input.constraintsJson as never,
      fieldPatternKey: input.fieldPatternKey,
      includeInCurrent: input.includeInCurrent,
      status: input.status,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertRegistryProfile")
  upsertRegistryProfile(
    @Args("input") input: TUpsertRegistryProfileArgs,
  ) {
    return this.registryService.upsertProfile({
      key: input.key,
      entity: input.entity,
      kind: input.kind,
      title: input.title,
      description: input.description,
      isActive: input.isActive,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("setRegistryProfileFields")
  setRegistryProfileFields(
    @Args("input") input: TSetRegistryProfileFieldsArgs,
  ) {
    return this.registryService.setProfileFields({
      profileKey: input.profileKey,
      fieldIds: input.fieldIds,
      requiredFieldIds: input.requiredFieldIds,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("toggleRegistryFieldCurrent")
  toggleRegistryFieldCurrent(
    @Args("input") input: TToggleRegistryFieldCurrentArgs,
  ) {
    return this.registryService.toggleFieldCurrent(
      input.fieldId,
      input.includeInCurrent,
    );
  }
}
