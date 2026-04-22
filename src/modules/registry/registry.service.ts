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
  includeInCurrent?: boolean | null;
  status?: RegistryFieldSpecStatus | null;
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

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async listFieldSpecs(params?: {
    entity?: string;
    status?: RegistryFieldSpecStatus;
  }) {
    return this.prisma.registryFieldSpec.findMany({
      where: {
        entity: params?.entity?.trim() || undefined,
        status: params?.status ?? undefined,
      },
      orderBy: [{ entity: "asc" }, { fieldId: "asc" }],
    });
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

  async upsertFieldSpec(input: TUpsertRegistryFieldSpecInput) {
    const fieldId = input.fieldId.trim();
    const entity = input.entity.trim();
    const label = input.label.trim();
    const canonicalPath = input.canonicalPath.trim();

    this.validateFieldId(fieldId);
    this.validateCanonicalPath(canonicalPath);
    if (!entity.length) throw new BadRequestException("entity is required");
    if (!label.length) throw new BadRequestException("label is required");

    return this.prisma.registryFieldSpec.upsert({
      where: { fieldId },
      create: {
        fieldId,
        entity,
        label,
        valueType: input.valueType,
        semanticKind: input.semanticKind ?? RegistrySemanticKind.generic,
        unit: input.unit?.trim() || null,
        canonicalPath,
        required: input.required ?? false,
        formatJson: input.formatJson ?? undefined,
        constraintsJson: input.constraintsJson ?? undefined,
        includeInCurrent: input.includeInCurrent ?? false,
        status: input.status ?? RegistryFieldSpecStatus.active,
      },
      update: {
        entity,
        label,
        valueType: input.valueType,
        semanticKind: input.semanticKind ?? RegistrySemanticKind.generic,
        unit: input.unit?.trim() || null,
        canonicalPath,
        required: input.required ?? false,
        formatJson:
          input.formatJson === null ? Prisma.JsonNull : input.formatJson ?? undefined,
        constraintsJson:
          input.constraintsJson === null
            ? Prisma.JsonNull
            : input.constraintsJson ?? undefined,
        includeInCurrent: input.includeInCurrent ?? false,
        status: input.status ?? RegistryFieldSpecStatus.active,
        version: { increment: 1 },
      },
    });
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
      select: { id: true },
    });
    if (!profile) throw new NotFoundException("Registry profile not found");

    const specs = await this.prisma.registryFieldSpec.findMany({
      where: { fieldId: { in: fieldIds } },
      select: { id: true, fieldId: true },
    });
    if (specs.length !== fieldIds.length) {
      const present = new Set(specs.map((s) => s.fieldId));
      const missing = fieldIds.filter((id) => !present.has(id));
      throw new BadRequestException(`Unknown fieldIds: ${missing.join(", ")}`);
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
        "fieldId must be dot-separated keys (e.g. plant.solution.ph)",
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

  private validateCanonicalPath(path: string) {
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(path)) {
      throw new BadRequestException(
        "canonicalPath must be dot-separated keys (e.g. solution.ph)",
      );
    }
  }
}
