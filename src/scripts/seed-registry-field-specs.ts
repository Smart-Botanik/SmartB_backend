import {
  Prisma,
  PrismaClient,
  RegistryProfileKind,
  RegistrySemanticKind,
  RegistryValueType,
} from "@prisma/client";

type TPatternSeed = {
  key: string;
  title: string;
  valueType: RegistryValueType;
  semanticKind: RegistrySemanticKind;
  canonicalUnit?: string;
  allowedUnits?: string[];
  defaultInputUnit?: string;
  conversionProfile?: string;
  formatJson?: Record<string, unknown>;
  constraintsJson?: Record<string, unknown>;
};

type TFieldSeed = {
  fieldId: string;
  label: string;
  canonicalPath: string;
  valueType?: RegistryValueType;
  semanticKind: RegistrySemanticKind;
  patternKey?: string;
  unit?: string;
  required?: boolean;
  includeInCurrent?: boolean;
  formatJson?: Record<string, unknown>;
  constraintsJson?: Record<string, unknown>;
};

const FIELD_PATTERNS: TPatternSeed[] = [
  {
    key: "reference.string.v1",
    title: "Reference string",
    valueType: RegistryValueType.string,
    semanticKind: RegistrySemanticKind.generic,
    formatJson: {
      mode: "reference",
      idType: "string",
    },
  },
  {
    key: "product.reference.v1",
    title: "Product reference",
    valueType: RegistryValueType.string,
    semanticKind: RegistrySemanticKind.generic,
    formatJson: {
      mode: "reference",
      basePatternKey: "reference.string.v1",
      entity: "Product",
      control: "productPicker",
      idField: "productId",
      labelField: "product",
    },
  },
  {
    key: "ph.decimal.v1",
    title: "pH decimal",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.ph,
    canonicalUnit: "pH",
    allowedUnits: ["pH"],
    defaultInputUnit: "pH",
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0, max: 14 },
  },
  {
    key: "ppm.integer.v1",
    title: "PPM integer",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.ppm,
    canonicalUnit: "ppm",
    allowedUnits: ["ppm"],
    defaultInputUnit: "ppm",
    formatJson: { mode: "integer", step: 1 },
    constraintsJson: { min: 0 },
  },
  {
    key: "temperature.decimal.v1",
    title: "Temperature decimal",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.temperature,
    canonicalUnit: "C",
    allowedUnits: ["C", "F"],
    defaultInputUnit: "C",
    conversionProfile: "temperature_c_f",
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: -50, max: 120 },
  },
  {
    key: "nutrient-dose.decimal.v1",
    title: "Nutrient dose decimal",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.concentration,
    canonicalUnit: "mll",
    allowedUnits: ["mll", "mlg", "tspl"],
    defaultInputUnit: "mll",
    formatJson: { mode: "decimal", precision: 2, step: 0.1 },
    constraintsJson: { min: 0 },
  },
  {
    key: "length.cm.decimal.v1",
    title: "Length in centimeters",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.length,
    canonicalUnit: "cm",
    allowedUnits: ["cm"],
    defaultInputUnit: "cm",
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0 },
  },
  {
    key: "power.watt.integer.v1",
    title: "Power in watts",
    valueType: RegistryValueType.number,
    semanticKind: RegistrySemanticKind.generic,
    canonicalUnit: "W",
    allowedUnits: ["W"],
    defaultInputUnit: "W",
    formatJson: { mode: "integer", step: 1 },
    constraintsJson: { min: 0 },
  },
  {
    key: "equipment.lamp-array.json.v1",
    title: "Equipment lamp array",
    valueType: RegistryValueType.json,
    semanticKind: RegistrySemanticKind.generic,
    formatJson: {
      mode: "array",
      componentKey: "equipment.lamp-item.v1",
      item: "equipment.lamp-item",
      fields: {
        productId: {
          patternKey: "product.reference.v1",
          canonicalPath: "productId",
          required: false,
          control: "productPicker",
          entity: "Product",
          filters: { category: "LIGHTING" },
        },
        label: {
          patternKey: "reference.string.v1",
          canonicalPath: "label",
          required: false,
          role: "snapshotLabel",
        },
        watts: {
          patternKey: "power.watt.integer.v1",
          canonicalPath: "watts",
          required: false,
          control: "numberInput",
          unit: "W",
        },
      },
    },
  },
];

const PLANT_FIELD_SPECS: TFieldSeed[] = [
  {
    fieldId: "plant.watering.solution.ph",
    label: "Solution pH",
    canonicalPath: "watering.solution.ph",
    semanticKind: RegistrySemanticKind.ph,
    patternKey: "ph.decimal.v1",
    unit: "pH",
    required: true,
    includeInCurrent: true,
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0, max: 14 },
  },
  {
    fieldId: "plant.watering.solution.ppm",
    label: "Solution PPM",
    canonicalPath: "watering.solution.ppm",
    semanticKind: RegistrySemanticKind.ppm,
    patternKey: "ppm.integer.v1",
    unit: "ppm",
    required: false,
    includeInCurrent: true,
    formatJson: { mode: "integer", step: 1 },
    constraintsJson: { min: 0 },
  },
  {
    fieldId: "plant.watering.drainage.ph",
    label: "Drainage pH",
    canonicalPath: "watering.drainage.ph",
    semanticKind: RegistrySemanticKind.ph,
    patternKey: "ph.decimal.v1",
    unit: "pH",
    required: false,
    includeInCurrent: true,
    formatJson: { mode: "decimal", precision: 1, step: 0.1 },
    constraintsJson: { min: 0, max: 14 },
  },
  {
    fieldId: "plant.watering.drainage.ppm",
    label: "Drainage PPM",
    canonicalPath: "watering.drainage.ppm",
    semanticKind: RegistrySemanticKind.ppm,
    patternKey: "ppm.integer.v1",
    unit: "ppm",
    required: false,
    includeInCurrent: true,
    formatJson: { mode: "integer", step: 1 },
    constraintsJson: { min: 0 },
  },
  {
    fieldId: "plant.watering.nutrients",
    label: "Watering nutrients",
    canonicalPath: "watering.nutrients",
    valueType: RegistryValueType.json,
    semanticKind: RegistrySemanticKind.generic,
    required: false,
    includeInCurrent: true,
    formatJson: {
      mode: "array",
      componentKey: "watering.nutrient-item.v1",
      item: "watering.nutrient-item",
      fields: {
        productId: {
          patternKey: "product.reference.v1",
          canonicalPath: "productId",
          required: true,
          control: "productPicker",
          entity: "Product",
          filters: {
            category: "NUTRIENT",
          },
        },
        product: {
          patternKey: "reference.string.v1",
          canonicalPath: "product",
          required: false,
          role: "snapshotLabel",
        },
        "nutrient_amount.value": {
          patternKey: "nutrient-dose.decimal.v1",
          canonicalPath: "nutrient_amount.value",
          required: true,
          control: "doseInput",
          unitPath: "nutrient_amount.unit",
        },
      },
    },
  },
];

const WATERING_EVENT_PROFILE_KEY = "watering.event.v1";
const LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY = "location.indoor.equipment.v1";

const LOCATION_INDOOR_EQUIPMENT_FIELD_SPECS: TFieldSeed[] = [
  {
    fieldId: "location.indoor.enclosure.product_id",
    label: "Indoor enclosure product",
    canonicalPath: "equipment.enclosure.product_id",
    semanticKind: RegistrySemanticKind.generic,
    patternKey: "product.reference.v1",
    required: false,
    includeInCurrent: true,
  },
  {
    fieldId: "location.indoor.enclosure.width",
    label: "Indoor enclosure width",
    canonicalPath: "equipment.enclosure.width",
    semanticKind: RegistrySemanticKind.length,
    patternKey: "length.cm.decimal.v1",
    unit: "cm",
    required: false,
    includeInCurrent: true,
  },
  {
    fieldId: "location.indoor.enclosure.height",
    label: "Indoor enclosure height",
    canonicalPath: "equipment.enclosure.height",
    semanticKind: RegistrySemanticKind.length,
    patternKey: "length.cm.decimal.v1",
    unit: "cm",
    required: false,
    includeInCurrent: true,
  },
  {
    fieldId: "location.indoor.enclosure.depth",
    label: "Indoor enclosure depth",
    canonicalPath: "equipment.enclosure.depth",
    semanticKind: RegistrySemanticKind.length,
    patternKey: "length.cm.decimal.v1",
    unit: "cm",
    required: false,
    includeInCurrent: true,
  },
  {
    fieldId: "location.indoor.lighting.vegetation_lamps",
    label: "Vegetation lamps",
    canonicalPath: "equipment.lighting.vegetation_lamps",
    semanticKind: RegistrySemanticKind.generic,
    patternKey: "equipment.lamp-array.json.v1",
    required: false,
    includeInCurrent: true,
  },
  {
    fieldId: "location.indoor.lighting.bloom_lamps",
    label: "Bloom lamps",
    canonicalPath: "equipment.lighting.bloom_lamps",
    semanticKind: RegistrySemanticKind.generic,
    patternKey: "equipment.lamp-array.json.v1",
    required: false,
    includeInCurrent: true,
  },
];

const LEGACY_WATERING_FIELD_IDS = [
  "plant.solution.ph",
  "plant.solution.ppm",
  "plant.drainage.ph",
  "plant.drainage.ppm",
] as const;

const toInputJsonValue = (
  value?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined => {
  if (!value) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
};

export async function seedRegistryFieldSpecs(prisma: PrismaClient): Promise<{
  patterns: number;
  fields: number;
  profileKey: string;
  profileKeys: string[];
}> {
  for (const pattern of FIELD_PATTERNS) {
    await prisma.registryFieldPattern.upsert({
      where: { key: pattern.key },
      create: {
        key: pattern.key,
        title: pattern.title,
        valueType: pattern.valueType,
        semanticKind: pattern.semanticKind,
        canonicalUnit: pattern.canonicalUnit,
        allowedUnitsJson: pattern.allowedUnits as Prisma.InputJsonValue,
        defaultInputUnit: pattern.defaultInputUnit,
        conversionProfile: pattern.conversionProfile,
        formatJson: toInputJsonValue(pattern.formatJson),
        constraintsJson: toInputJsonValue(pattern.constraintsJson),
        isActive: true,
      },
      update: {
        title: pattern.title,
        valueType: pattern.valueType,
        semanticKind: pattern.semanticKind,
        canonicalUnit: pattern.canonicalUnit,
        allowedUnitsJson: pattern.allowedUnits as Prisma.InputJsonValue,
        defaultInputUnit: pattern.defaultInputUnit,
        conversionProfile: pattern.conversionProfile,
        formatJson: toInputJsonValue(pattern.formatJson),
        constraintsJson: toInputJsonValue(pattern.constraintsJson),
        isActive: true,
      },
    });
  }

  const fieldIds: string[] = [];

  for (const field of PLANT_FIELD_SPECS) {
    const pattern = field.patternKey
      ? await prisma.registryFieldPattern.findUnique({
          where: { key: field.patternKey },
          select: { id: true, valueType: true },
        })
      : null;

    const saved = await prisma.registryFieldSpec.upsert({
      where: { fieldId: field.fieldId },
      create: {
        fieldId: field.fieldId,
        entity: "Plant",
        label: field.label,
        valueType: pattern?.valueType ?? field.valueType ?? RegistryValueType.number,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
        fieldPatternId: pattern?.id,
      },
      update: {
        label: field.label,
        valueType: pattern?.valueType ?? field.valueType ?? RegistryValueType.number,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
        fieldPatternId: pattern?.id,
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

  const locationEquipmentFieldIds: string[] = [];

  for (const field of LOCATION_INDOOR_EQUIPMENT_FIELD_SPECS) {
    const pattern = field.patternKey
      ? await prisma.registryFieldPattern.findUnique({
          where: { key: field.patternKey },
          select: { id: true, valueType: true },
        })
      : null;

    const saved = await prisma.registryFieldSpec.upsert({
      where: { fieldId: field.fieldId },
      create: {
        fieldId: field.fieldId,
        entity: "Location",
        label: field.label,
        valueType: pattern?.valueType ?? field.valueType ?? RegistryValueType.number,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
        fieldPatternId: pattern?.id,
      },
      update: {
        entity: "Location",
        label: field.label,
        valueType: pattern?.valueType ?? field.valueType ?? RegistryValueType.number,
        semanticKind: field.semanticKind,
        unit: field.unit,
        canonicalPath: field.canonicalPath,
        required: field.required ?? false,
        includeInCurrent: field.includeInCurrent ?? false,
        formatJson: toInputJsonValue(field.formatJson),
        constraintsJson: toInputJsonValue(field.constraintsJson),
        fieldPatternId: pattern?.id,
      },
      select: { id: true },
    });

    locationEquipmentFieldIds.push(saved.id);
  }

  const locationEquipmentProfile = await prisma.registryProfile.upsert({
    where: { key: LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY },
    create: {
      key: LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY,
      entity: "Location",
      kind: RegistryProfileKind.event_write,
      title: "Location indoor equipment v1",
      description: "Canonical profile for indoor Location equipment payload assembly in v1.",
      version: 1,
      isActive: true,
    },
    update: {
      entity: "Location",
      kind: RegistryProfileKind.event_write,
      title: "Location indoor equipment v1",
      description: "Canonical profile for indoor Location equipment payload assembly in v1.",
      isActive: true,
    },
    select: { id: true },
  });

  await prisma.registryProfileField.deleteMany({
    where: { profileId: locationEquipmentProfile.id },
  });

  await prisma.registryProfileField.createMany({
    data: locationEquipmentFieldIds.map((fieldSpecId, index) => ({
      profileId: locationEquipmentProfile.id,
      fieldSpecId,
      position: index,
      required: false,
    })),
    skipDuplicates: true,
  });

  const legacyFieldSpecs = await prisma.registryFieldSpec.findMany({
    where: { fieldId: { in: [...LEGACY_WATERING_FIELD_IDS] } },
    select: { id: true },
  });

  const legacyFieldSpecIds = legacyFieldSpecs.map((fieldSpec) => fieldSpec.id);

  if (legacyFieldSpecIds.length) {
    await prisma.registryProfileField.deleteMany({
      where: { fieldSpecId: { in: legacyFieldSpecIds } },
    });

    await prisma.registryFieldSpec.deleteMany({
      where: { id: { in: legacyFieldSpecIds } },
    });
  }

  return {
    patterns: FIELD_PATTERNS.length,
    fields: PLANT_FIELD_SPECS.length + LOCATION_INDOOR_EQUIPMENT_FIELD_SPECS.length,
    profileKey: WATERING_EVENT_PROFILE_KEY,
    profileKeys: [WATERING_EVENT_PROFILE_KEY, LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY],
  };
}

async function runCli(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const result = await seedRegistryFieldSpecs(prisma);
    console.log(
      `Registry field specs seed completed: patterns=${result.patterns}, fields=${result.fields}, profiles=${result.profileKeys.join(",")}`,
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
