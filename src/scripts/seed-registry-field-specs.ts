import {
  Prisma,
  PrismaClient,
  RegistryProfileKind,
  RegistryValueType,
} from "@prisma/client";

type TFieldSeed = {
  fieldId: string;
  label: string;
  canonicalPath: string;
  semanticKind: "ph" | "ppm" | "temperature" | "generic";
  unit?: string;
  required?: boolean;
  includeInCurrent?: boolean;
  formatJson?: Record<string, unknown>;
  constraintsJson?: Record<string, unknown>;
};

const PLANT_FIELD_SPECS: TFieldSeed[] = [
  {
    fieldId: "plant.solution.ph",
    label: "Solution pH",
    canonicalPath: "solution.ph",
    semanticKind: "ph",
    unit: "pH",
    required: true,
    includeInCurrent: true,
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0, max: 14 },
  },
  {
    fieldId: "plant.solution.ppm",
    label: "Solution PPM",
    canonicalPath: "solution.ppm",
    semanticKind: "ppm",
    unit: "ppm",
    required: false,
    includeInCurrent: true,
    formatJson: { mode: "integer", step: 1 },
    constraintsJson: { min: 0 },
  },
  {
    fieldId: "plant.drainage.ph",
    label: "Drainage pH",
    canonicalPath: "drainage.ph",
    semanticKind: "ph",
    unit: "pH",
    required: false,
    includeInCurrent: true,
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0, max: 14 },
  },
];

const WATERING_EVENT_PROFILE_KEY = "watering.event.v1";

const toInputJsonValue = (
  value?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined => {
  if (!value) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
};

export async function seedRegistryFieldSpecs(prisma: PrismaClient): Promise<{
  fields: number;
  profileKey: string;
}> {
  const fieldIds: string[] = [];

  for (const field of PLANT_FIELD_SPECS) {
    const saved = await prisma.registryFieldSpec.upsert({
      where: { fieldId: field.fieldId },
      create: {
        fieldId: field.fieldId,
        entity: "Plant",
        label: field.label,
        valueType: RegistryValueType.number,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
      },
      update: {
        label: field.label,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
      },
      select: { id: true, fieldId: true },
    });

    fieldIds.push(saved.id);
  }

  const profile = await prisma.registryProfile.upsert({
    where: { key: WATERING_EVENT_PROFILE_KEY },
    create: {
      key: WATERING_EVENT_PROFILE_KEY,
      entity: "Plant",
      kind: RegistryProfileKind.event_write,
      title: "Watering event v1",
      description: "Canonical profile for watering event payload assembly in v1.",
      version: 1,
      isActive: true,
    },
    update: {
      entity: "Plant",
      kind: RegistryProfileKind.event_write,
      title: "Watering event v1",
      description: "Canonical profile for watering event payload assembly in v1.",
      isActive: true,
    },
    select: { id: true },
  });

  await prisma.registryProfileField.deleteMany({
    where: { profileId: profile.id },
  });

  await prisma.registryProfileField.createMany({
    data: fieldIds.map((fieldSpecId, index) => ({
      profileId: profile.id,
      fieldSpecId,
      position: index,
      required: index === 0,
    })),
    skipDuplicates: true,
  });

  return {
    fields: PLANT_FIELD_SPECS.length,
    profileKey: WATERING_EVENT_PROFILE_KEY,
  };
}

async function runCli(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const result = await seedRegistryFieldSpecs(prisma);
    console.log(
      `Registry field specs seed completed: fields=${result.fields}, profile=${result.profileKey}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
