import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  RegistryFieldSpecStatus,
  RegistryProfileKind,
  RegistrySemanticKind,
  RegistryValueType,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

type TUpsertRegistryFieldSpecInput = {
  fieldId: string;
  entity: string;
  label: string;
  valueType: RegistryValueType;
  semanticKind?: RegistrySemanticKind | null;
  unit?: string | null;
  canonicalPath: string;
  required?: boolean | null;
  formatJson?: Prisma.InputJsonValue | null;
  constraintsJson?: Prisma.InputJsonValue | null;
  fieldPatternKey?: string | null;
  includeInCurrent?: boolean | null;
  status?: RegistryFieldSpecStatus | null;
};

type TUpsertRegistryFieldPatternInput = {
  key: string;
  title: string;
  valueType: RegistryValueType;
  semanticKind?: RegistrySemanticKind | null;
  canonicalUnit?: string | null;
  allowedUnits?: string[] | null;
  defaultInputUnit?: string | null;
  conversionProfile?: string | null;
  formatJson?: Prisma.InputJsonValue | null;
  constraintsJson?: Prisma.InputJsonValue | null;
  isActive?: boolean | null;
};

type TUpsertRegistryProfileInput = {
  key: string;
  entity: string;
  kind: RegistryProfileKind;
  title: string;
  description?: string | null;
  isActive?: boolean | null;
};

type TSetRegistryProfileFieldsInput = {
  profileKey: string;
  fieldIds: string[];
  requiredFieldIds?: string[] | null;
};

type TRegistryBuildPreviewInput = {
  profileKey: string;
  valuesJson: Record<string, unknown>;
};

type TRegistryBuildPreviewError = {
  fieldId?: string | null;
  code: string;
  message: string;
};

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async listFieldPatterns(params?: { isActive?: boolean }) {
    return this.prisma.registryFieldPattern.findMany({
      where: {
        isActive:
          typeof params?.isActive === "boolean" ? params.isActive : undefined,
      },
      orderBy: [{ key: "asc" }],
    }).then(rows =>
      rows.map(row => ({
        ...row,
        allowedUnits: this.asStringArray(row.allowedUnitsJson),
      })),
    );
  }

  async listFieldSpecs(params?: {
    entity?: string;
    status?: RegistryFieldSpecStatus;
  }) {
    return this.prisma.registryFieldSpec.findMany({
      where: {
        entity: params?.entity?.trim() || undefined,
        status: params?.status ?? undefined,
      },
      include: {
        fieldPattern: { select: { key: true } },
      },
      orderBy: [{ entity: "asc" }, { fieldId: "asc" }],
    }).then(rows =>
      rows.map(row => ({
        ...row,
        fieldPatternKey: row.fieldPattern?.key ?? null,
      })),
    );
  }

  async listProfiles(params?: {
    entity?: string;
    kind?: RegistryProfileKind;
    isActive?: boolean;
  }) {
    const rows = await this.prisma.registryProfile.findMany({
      where: {
        entity: params?.entity?.trim() || undefined,
        kind: params?.kind ?? undefined,
        isActive:
          typeof params?.isActive === "boolean" ? params.isActive : undefined,
      },
      include: {
        fields: {
          include: {
            fieldSpec: { select: { fieldId: true } },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: [{ entity: "asc" }, { key: "asc" }],
    });

    return rows.map((row) => this.mapProfile(row));
  }

  async getProfileByKey(key: string) {
    const row = await this.prisma.registryProfile.findUnique({
      where: { key },
      include: {
        fields: {
          include: {
            fieldSpec: { select: { fieldId: true } },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!row) {
      return null;
    }

    return this.mapProfile(row);
  }

  async upsertFieldPattern(input: TUpsertRegistryFieldPatternInput) {
    const key = input.key.trim();
    const title = input.title.trim();
    this.validateFieldPatternKey(key);
    if (!title.length) throw new BadRequestException("title is required");
    const canonicalUnit = input.canonicalUnit?.trim() || null;
    const allowedUnits = [...new Set((input.allowedUnits ?? []).map(u => u.trim()).filter(Boolean))];
    const defaultInputUnit = input.defaultInputUnit?.trim() || null;
    if (canonicalUnit && allowedUnits.length && !allowedUnits.includes(canonicalUnit)) {
      throw new BadRequestException("canonicalUnit must belong to allowedUnits");
    }
    if (defaultInputUnit && canonicalUnit && !allowedUnits.includes(defaultInputUnit) && defaultInputUnit !== canonicalUnit) {
      throw new BadRequestException("defaultInputUnit must belong to allowedUnits or match canonicalUnit");
    }

    return this.prisma.registryFieldPattern.upsert({
      where: { key },
      create: {
        key,
        title,
        valueType: input.valueType,
        semanticKind: input.semanticKind ?? RegistrySemanticKind.generic,
        canonicalUnit,
        allowedUnitsJson: allowedUnits.length ? (allowedUnits as unknown as Prisma.InputJsonValue) : undefined,
        defaultInputUnit,
        conversionProfile: input.conversionProfile?.trim() || null,
        formatJson: input.formatJson ?? undefined,
        constraintsJson: input.constraintsJson ?? undefined,
        isActive: input.isActive ?? true,
      },
      update: {
        title,
        valueType: input.valueType,
        semanticKind: input.semanticKind ?? RegistrySemanticKind.generic,
        canonicalUnit,
        allowedUnitsJson: allowedUnits.length ? (allowedUnits as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        defaultInputUnit,
        conversionProfile: input.conversionProfile?.trim() || null,
        formatJson: input.formatJson === null ? Prisma.JsonNull : input.formatJson ?? undefined,
        constraintsJson: input.constraintsJson === null ? Prisma.JsonNull : input.constraintsJson ?? undefined,
        isActive: input.isActive ?? true,
        version: { increment: 1 },
      },
    }).then(row => ({
      ...row,
      allowedUnits: this.asStringArray(row.allowedUnitsJson),
    }));
  }

  async upsertFieldSpec(input: TUpsertRegistryFieldSpecInput) {
    const fieldId = input.fieldId.trim();
    const entity = input.entity.trim();
    const label = input.label.trim();
    const canonicalPath = input.canonicalPath.trim();

    this.validateFieldId(fieldId);
    this.validateCanonicalPath(canonicalPath);
    if (!entity.length) throw new BadRequestException("entity is required");
    if (!label.length) throw new BadRequestException("label is required");

    const patternKey = input.fieldPatternKey?.trim() || null;
    const pattern = patternKey
      ? await this.prisma.registryFieldPattern.findUnique({ where: { key: patternKey } })
      : null;
    if (patternKey && !pattern) {
      throw new BadRequestException(`Unknown fieldPatternKey: ${patternKey}`);
    }

    return this.prisma.registryFieldSpec.upsert({
      where: { fieldId },
      create: {
        fieldId,
        entity,
        label,
        valueType: pattern?.valueType ?? input.valueType,
        semanticKind: pattern?.semanticKind ?? input.semanticKind ?? RegistrySemanticKind.generic,
        unit: pattern?.canonicalUnit ?? (input.unit?.trim() || null),
        canonicalPath,
        required: input.required ?? false,
        formatJson: pattern?.formatJson ?? input.formatJson ?? undefined,
        constraintsJson: pattern?.constraintsJson ?? input.constraintsJson ?? undefined,
        fieldPatternId: pattern?.id ?? null,
        includeInCurrent: input.includeInCurrent ?? false,
        status: input.status ?? RegistryFieldSpecStatus.active,
      },
      update: {
        entity,
        label,
        valueType: pattern?.valueType ?? input.valueType,
        semanticKind: pattern?.semanticKind ?? input.semanticKind ?? RegistrySemanticKind.generic,
        unit: pattern?.canonicalUnit ?? (input.unit?.trim() || null),
        canonicalPath,
        required: input.required ?? false,
        formatJson: pattern
          ? (pattern.formatJson ?? Prisma.JsonNull)
          : input.formatJson === null
            ? Prisma.JsonNull
            : input.formatJson ?? undefined,
        constraintsJson: pattern
          ? (pattern.constraintsJson ?? Prisma.JsonNull)
          : input.constraintsJson === null
            ? Prisma.JsonNull
            : input.constraintsJson ?? undefined,
        fieldPatternId: pattern?.id ?? null,
        includeInCurrent: input.includeInCurrent ?? false,
        status: input.status ?? RegistryFieldSpecStatus.active,
        version: { increment: 1 },
      },
      include: {
        fieldPattern: { select: { key: true } },
      },
    }).then(row => ({
      ...row,
      fieldPatternKey: row.fieldPattern?.key ?? null,
    }));
  }

  async upsertProfile(input: TUpsertRegistryProfileInput) {
    const key = input.key.trim();
    const entity = input.entity.trim();
    const title = input.title.trim();

    this.validateProfileKey(key);
    if (!entity.length) throw new BadRequestException("entity is required");
    if (!title.length) throw new BadRequestException("title is required");

    const row = await this.prisma.registryProfile.upsert({
      where: { key },
      create: {
        key,
        entity,
        kind: input.kind,
        title,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
      update: {
        entity,
        kind: input.kind,
        title,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
        version: { increment: 1 },
      },
      include: {
        fields: {
          include: {
            fieldSpec: { select: { fieldId: true } },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    return this.mapProfile(row);
  }

  async setProfileFields(input: TSetRegistryProfileFieldsInput) {
    const profileKey = input.profileKey.trim();
    if (!profileKey.length) {
      throw new BadRequestException("profileKey is required");
    }

    const fieldIds = [...new Set(input.fieldIds.map((id) => id.trim()).filter(Boolean))];
    if (!fieldIds.length) {
      throw new BadRequestException("fieldIds must contain at least one item");
    }

    const requiredSet = new Set(
      (input.requiredFieldIds ?? []).map((id) => id.trim()).filter(Boolean),
    );
    for (const id of requiredSet) {
      if (!fieldIds.includes(id)) {
        throw new BadRequestException(
          `requiredFieldId "${id}" must be present in fieldIds`,
        );
      }
    }

    const profile = await this.prisma.registryProfile.findUnique({
      where: { key: profileKey },
      select: { id: true, entity: true, isActive: true },
    });
    if (!profile) throw new NotFoundException("Registry profile not found");

    const specs = await this.prisma.registryFieldSpec.findMany({
      where: { fieldId: { in: fieldIds } },
      select: { id: true, fieldId: true, entity: true, status: true },
    });
    if (specs.length !== fieldIds.length) {
      const present = new Set(specs.map((s) => s.fieldId));
      const missing = fieldIds.filter((id) => !present.has(id));
      throw new BadRequestException(`Unknown fieldIds: ${missing.join(", ")}`);
    }

    const entityMismatches = specs
      .filter((spec) => spec.entity !== profile.entity)
      .map((spec) => spec.fieldId);
    if (entityMismatches.length) {
      throw new BadRequestException(
        `Field entity mismatch for profile "${profileKey}": ${entityMismatches.join(", ")}`,
      );
    }

    const deprecatedFieldIds = specs
      .filter((spec) => spec.status !== RegistryFieldSpecStatus.active)
      .map((spec) => spec.fieldId);
    if (profile.isActive && deprecatedFieldIds.length) {
      throw new BadRequestException(
        `Active profile cannot include deprecated fieldIds: ${deprecatedFieldIds.join(", ")}`,
      );
    }

    const byFieldId = new Map(specs.map((s) => [s.fieldId, s.id]));

    await this.prisma.$transaction(async (tx) => {
      await tx.registryProfileField.deleteMany({ where: { profileId: profile.id } });
      await tx.registryProfileField.createMany({
        data: fieldIds.map((fieldId, position) => ({
          profileId: profile.id,
          fieldSpecId: byFieldId.get(fieldId)!,
          position,
          required: requiredSet.has(fieldId),
        })),
      });
      await tx.registryProfile.update({
        where: { id: profile.id },
        data: { version: { increment: 1 } },
      });
    });

    return this.getProfileByKey(profileKey);
  }

  async getFieldSpecUsage(fieldIdRaw: string) {
    const fieldId = fieldIdRaw.trim();
    if (!fieldId.length) {
      throw new BadRequestException("fieldId is required");
    }

    const fieldSpec = await this.prisma.registryFieldSpec.findUnique({
      where: { fieldId },
      select: { fieldId: true, status: true },
    });
    if (!fieldSpec) {
      throw new NotFoundException("Registry field spec not found");
    }

    const profileFields = await this.prisma.registryProfileField.findMany({
      where: { fieldSpec: { fieldId } },
      select: { profile: { select: { key: true } } },
      orderBy: { profile: { key: "asc" } },
    });

    const profileKeys = profileFields.map(row => row.profile.key);

    return {
      fieldId: fieldSpec.fieldId,
      profileKeys,
      profileCount: profileKeys.length,
      isDeprecated: fieldSpec.status !== RegistryFieldSpecStatus.active,
    };
  }

  async deprecateFieldSpec(fieldIdRaw: string) {
    const fieldId = fieldIdRaw.trim();
    if (!fieldId.length) {
      throw new BadRequestException("fieldId is required");
    }

    const existing = await this.prisma.registryFieldSpec.findUnique({
      where: { fieldId },
      include: { fieldPattern: { select: { key: true } } },
    });
    if (!existing) {
      throw new NotFoundException("Registry field spec not found");
    }

    if (existing.status === RegistryFieldSpecStatus.deprecated) {
      return {
        ...existing,
        fieldPatternKey: existing.fieldPattern?.key ?? null,
      };
    }

    return this.prisma.registryFieldSpec
      .update({
        where: { fieldId },
        data: {
          status: RegistryFieldSpecStatus.deprecated,
          version: { increment: 1 },
        },
        include: { fieldPattern: { select: { key: true } } },
      })
      .then(row => ({
        ...row,
        fieldPatternKey: row.fieldPattern?.key ?? null,
      }));
  }

  async buildPreview(input: TRegistryBuildPreviewInput) {
    const profileKey = input.profileKey.trim();
    if (!profileKey.length) {
      throw new BadRequestException("profileKey is required");
    }
    if (!this.isPlainRecord(input.valuesJson)) {
      throw new BadRequestException("valuesJson must be an object keyed by fieldId");
    }

    const profile = await this.prisma.registryProfile.findUnique({
      where: { key: profileKey },
      include: {
        fields: {
          include: { fieldSpec: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!profile) throw new NotFoundException("Registry profile not found");

    const payload: Record<string, unknown> = {};
    const errors: TRegistryBuildPreviewError[] = [];

    for (const profileField of profile.fields) {
      const fieldSpec = profileField.fieldSpec;
      const value = input.valuesJson[fieldSpec.fieldId];
      const isRequired = profileField.required || fieldSpec.required;

      if (value === undefined || value === null || value === "") {
        if (isRequired) {
          errors.push({
            fieldId: fieldSpec.fieldId,
            code: "required",
            message: `${fieldSpec.fieldId} is required`,
          });
        }
        continue;
      }

      const fieldErrors = this.validatePreviewValue(fieldSpec, value);
      if (fieldErrors.length) {
        errors.push(...fieldErrors);
        continue;
      }

      const pathError = this.setValueAtPath(payload, fieldSpec.canonicalPath, value);
      if (pathError) {
        errors.push({
          fieldId: fieldSpec.fieldId,
          code: "canonical_path_conflict",
          message: pathError,
        });
      }
    }

    return { payload, errors };
  }

  async toggleFieldCurrent(fieldIdRaw: string, includeInCurrent: boolean) {
    const fieldId = fieldIdRaw.trim();
    if (!fieldId.length) throw new BadRequestException("fieldId is required");

    try {
      return await this.prisma.registryFieldSpec.update({
        where: { fieldId },
        data: {
          includeInCurrent,
          version: { increment: 1 },
        },
      });
    } catch {
      throw new NotFoundException("Registry field spec not found");
    }
  }

  private mapProfile(
    row: Prisma.RegistryProfileGetPayload<{
      include: { fields: { include: { fieldSpec: { select: { fieldId: true } } } } };
    }>,
  ) {
    return {
      ...row,
      fields: row.fields.map((f) => ({
        id: f.id,
        fieldId: f.fieldSpec.fieldId,
        required: f.required,
        position: f.position,
      })),
    };
  }

  private validateFieldId(fieldId: string) {
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(fieldId)) {
      throw new BadRequestException(
        "fieldId must be dot-separated keys (e.g. plant.watering.solution.ph)",
      );
    }
  }

  private validateProfileKey(key: string) {
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(key)) {
      throw new BadRequestException(
        "profile key must be dot-separated keys (e.g. watering.event.v1)",
      );
    }
  }

  private validateFieldPatternKey(key: string) {
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(key)) {
      throw new BadRequestException(
        "fieldPattern key must be dot-separated keys (e.g. ph.decimal.v1)",
      );
    }
  }

  private validateCanonicalPath(path: string) {
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(path)) {
      throw new BadRequestException(
        "canonicalPath must be dot-separated keys (e.g. solution.ph)",
      );
    }
  }

  private asStringArray(payload: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(payload)) return [];
    return payload.filter((value): value is string => typeof value === "string");
  }

  private validatePreviewValue(
    fieldSpec: Prisma.RegistryFieldSpecGetPayload<Record<string, never>>,
    value: unknown,
  ): TRegistryBuildPreviewError[] {
    const errors: TRegistryBuildPreviewError[] = [];
    const format = this.asPlainRecord(fieldSpec.formatJson);
    const constraints = this.asPlainRecord(fieldSpec.constraintsJson);
    const fail = (code: string, message: string) => {
      errors.push({ fieldId: fieldSpec.fieldId, code, message });
    };

    switch (fieldSpec.valueType) {
      case RegistryValueType.number:
        if (typeof value !== "number" || !Number.isFinite(value)) {
          fail("invalid_type", `${fieldSpec.fieldId} must be a finite number`);
          return errors;
        }
        this.validateNumberValue(fieldSpec.fieldId, value, format, constraints, fail);
        break;
      case RegistryValueType.string:
        if (typeof value !== "string") {
          fail("invalid_type", `${fieldSpec.fieldId} must be a string`);
        }
        break;
      case RegistryValueType.boolean:
        if (typeof value !== "boolean") {
          fail("invalid_type", `${fieldSpec.fieldId} must be a boolean`);
        }
        break;
      case RegistryValueType.json:
        if (value === undefined) {
          fail("invalid_type", `${fieldSpec.fieldId} must be valid JSON`);
        }
        break;
      case RegistryValueType.date:
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
          fail("invalid_type", `${fieldSpec.fieldId} must be an ISO date string`);
        }
        break;
      case RegistryValueType.enum: {
        const enumValues = Array.isArray(constraints.enumValues)
          ? constraints.enumValues
          : [];
        if (!enumValues.includes(value)) {
          fail("enum_value", `${fieldSpec.fieldId} must match one of enumValues`);
        }
        break;
      }
      default:
        fail("unsupported_value_type", `${fieldSpec.fieldId} has unsupported valueType`);
    }

    return errors;
  }

  private validateNumberValue(
    fieldId: string,
    value: number,
    format: Record<string, unknown>,
    constraints: Record<string, unknown>,
    fail: (code: string, message: string) => void,
  ) {
    if (format.mode === "integer" && !Number.isInteger(value)) {
      fail("integer", `${fieldId} must be an integer`);
    }

    if (format.mode === "decimal" && typeof format.precision === "number") {
      const decimalLength = this.countDecimalPlaces(value);
      if (decimalLength > format.precision) {
        fail("precision", `${fieldId} must have no more than ${format.precision} decimal places`);
      }
    }

    if (typeof format.step === "number" && format.step > 0) {
      const min = typeof constraints.min === "number" ? constraints.min : 0;
      const ratio = (value - min) / format.step;
      if (Math.abs(ratio - Math.round(ratio)) > 1e-9) {
        fail("step", `${fieldId} must match step ${format.step}`);
      }
    }

    if (typeof constraints.min === "number" && value < constraints.min) {
      fail("min", `${fieldId} must be greater than or equal to ${constraints.min}`);
    }
    if (typeof constraints.max === "number" && value > constraints.max) {
      fail("max", `${fieldId} must be less than or equal to ${constraints.max}`);
    }
  }

  private countDecimalPlaces(value: number): number {
    const [, decimals = ""] = value.toString().split(".");
    return decimals.length;
  }

  private setValueAtPath(
    target: Record<string, unknown>,
    path: string,
    value: unknown,
  ): string | null {
    const segments = path.split(".");
    let cursor: Record<string, unknown> = target;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;

      if (isLeaf) {
        cursor[segment] = value;
        return null;
      }

      const next = cursor[segment];
      if (next === undefined) {
        cursor[segment] = {};
      } else if (!this.isPlainRecord(next)) {
        return `Cannot set ${path}: "${segments.slice(0, index + 1).join(".")}" is already a scalar`;
      }

      cursor = cursor[segment] as Record<string, unknown>;
    }

    return null;
  }

  private asPlainRecord(payload: Prisma.JsonValue | null): Record<string, unknown> {
    if (!this.isPlainRecord(payload)) return {};
    return payload;
  }

  private isPlainRecord(payload: unknown): payload is Record<string, unknown> {
    return typeof payload === "object" && payload !== null && !Array.isArray(payload);
  }
}
