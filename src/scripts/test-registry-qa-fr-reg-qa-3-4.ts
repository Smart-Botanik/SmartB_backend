import {
  PrismaClient,
  RegistryFieldSpecStatus,
} from "@prisma/client";
import {
  buildNormalizedValuesJson,
  type RegistryFieldInputValue,
  type RegistryFieldRuntimeSpec,
  type RegistryPatternRuntimeSpec,
} from "@growing/contracts";
import { RegistryService } from "../modules/registry/registry.service";
import { seedRegistryFieldSpecs } from "./seed-registry-field-specs";

const WATERING_PROFILE_KEY = "watering.event.v1";
const DIARY_PROFILE_KEY = "diary.setup.config.v1";
const CREATE_DIARY_EVENT_PROFILE_KEY = "diary.setup.config.v1";

const WATERING_FIELD_IDS = [
  "plant.watering.solution.ph",
  "plant.watering.solution.ppm",
  "plant.watering.drainage.ph",
  "plant.watering.drainage.ppm",
  "plant.watering.nutrients",
] as const;

const DIARY_FIELD_IDS = ["diary.setup.watering_type", "diary.setup.room_type"] as const;

const WATERING_RUNTIME_INPUTS: Record<string, RegistryFieldInputValue> = {
  "plant.watering.solution.ph": { value: 6.2, unit: "pH" },
  "plant.watering.solution.ppm": { value: 820, unit: "ppm" },
  "plant.watering.drainage.ph": { value: 6.4, unit: "pH" },
  "plant.watering.drainage.ppm": { value: 900, unit: "ppm" },
  "plant.watering.nutrients": {
    value: JSON.stringify(
      [
        {
          productId: "product-1",
          product: "Base Nutrient",
          nutrient_amount: { value: 1.5, unit: "mll" },
        },
      ],
      null,
      2,
    ),
  },
};

const DIARY_RUNTIME_INPUTS: Record<string, RegistryFieldInputValue> = {
  "diary.setup.watering_type": { value: "hydroponics" },
  "diary.setup.room_type": { value: "indoor" },
};

const EXPECTED_WATERING_PAYLOAD = {
  watering: {
    solution: { ph: 6.2, ppm: 820 },
    drainage: { ph: 6.4, ppm: 900 },
    nutrients: [
      {
        productId: "product-1",
        product: "Base Nutrient",
        nutrient_amount: { value: 1.5, unit: "mll" },
      },
    ],
  },
};

const EXPECTED_DIARY_PAYLOAD = {
  diary: {
    wateringType: "hydroponics",
    roomType: "indoor",
  },
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

type ProfileBuildRow = {
  field: RegistryFieldRuntimeSpec;
  pattern?: RegistryPatternRuntimeSpec | null;
  required?: boolean;
};

async function loadProfileBuildRows(
  service: RegistryService,
  profileKey: string,
): Promise<ProfileBuildRow[]> {
  const profile = await service.getProfileByKey(profileKey);
  assert(profile, `Profile ${profileKey} must exist`);

  const [fieldSpecs, patterns] = await Promise.all([
    service.listFieldSpecs({
      entity: profile.entity,
      status: RegistryFieldSpecStatus.active,
    }),
    service.listFieldPatterns({ isActive: true }),
  ]);

  const patternByKey = new Map(patterns.map(pattern => [pattern.key, pattern]));
  const specByFieldId = new Map(fieldSpecs.map(spec => [spec.fieldId, spec]));

  return profile.fields.map(profileField => {
    const spec = specByFieldId.get(profileField.fieldId);
    assert(spec, `Field spec ${profileField.fieldId} must exist for ${profileKey}`);

    const patternKey = spec.fieldPatternKey;
    const patternRow = patternKey ? patternByKey.get(patternKey) : null;

    const field: RegistryFieldRuntimeSpec = {
      fieldId: spec.fieldId,
      valueType: spec.valueType,
      unit: spec.unit,
      fieldPatternKey: patternKey,
      formatJson: (spec.formatJson as Record<string, unknown> | null) ?? null,
      constraintsJson: (spec.constraintsJson as Record<string, unknown> | null) ?? null,
    };

    const pattern: RegistryPatternRuntimeSpec | null = patternRow
      ? {
          key: patternRow.key,
          canonicalUnit: patternRow.canonicalUnit,
          allowedUnits: patternRow.allowedUnits,
          defaultInputUnit: patternRow.defaultInputUnit,
          conversionProfile: patternRow.conversionProfile,
        }
      : null;

    return {
      field,
      pattern,
      required: profileField.required,
    };
  });
}

function buildFromRuntimeInputs(
  rows: ProfileBuildRow[],
  inputs: Record<string, RegistryFieldInputValue>,
) {
  return buildNormalizedValuesJson(
    rows.map(row => ({
      field: row.field,
      pattern: row.pattern,
      input: inputs[row.field.fieldId] ?? {},
      required: row.required,
    })),
  );
}

async function runQa3(service: RegistryService) {
  const rows = await loadProfileBuildRows(service, WATERING_PROFILE_KEY);
  const profile = await service.getProfileByKey(WATERING_PROFILE_KEY);
  assert(profile, "FR-REG-QA-3: watering.event.v1 must exist");

  assert(
    JSON.stringify(profile.fields.map(field => field.fieldId)) ===
      JSON.stringify(WATERING_FIELD_IDS),
    "FR-REG-QA-3: profile field picker must match seed order",
  );

  const phRow = rows.find(row => row.field.fieldId === "plant.watering.solution.ph");
  const ppmRow = rows.find(row => row.field.fieldId === "plant.watering.solution.ppm");
  assert(phRow?.pattern?.canonicalUnit === "pH", "FR-REG-QA-3: pH field must expose unit policy");
  assert(ppmRow?.pattern?.canonicalUnit === "ppm", "FR-REG-QA-3: ppm field must expose unit policy");

  const normalized = buildFromRuntimeInputs(rows, WATERING_RUNTIME_INPUTS);
  assert(
    normalized.errors.length === 0,
    `FR-REG-QA-3: normalizer must pass for runtime inputs, got ${JSON.stringify(normalized.errors)}`,
  );

  const preview = await service.buildPreview({
    profileKey: WATERING_PROFILE_KEY,
    valuesJson: normalized.valuesJson,
  });
  assert(
    preview.errors.length === 0,
    `FR-REG-QA-3: buildPreview must succeed, got ${JSON.stringify(preview.errors)}`,
  );
  assert(
    JSON.stringify(preview.payload) === JSON.stringify(EXPECTED_WATERING_PAYLOAD),
    "FR-REG-QA-3: payload must match watering canonical tree",
  );

  const ecWithoutProfile = buildNormalizedValuesJson([
    {
      field: {
        fieldId: "plant.qa.tds.fr_reg_qa_3",
        valueType: "number",
        unit: "ppm",
      },
      pattern: {
        canonicalUnit: "ppm",
        allowedUnits: ["ppm", "ec"],
        defaultInputUnit: "ppm",
      },
      input: { value: 1.2, unit: "ec" },
    },
  ]);
  assert(
    ecWithoutProfile.errors.some(error => error.code === "conversion_requires_profile"),
    "FR-REG-QA-3: EC→PPM without conversionProfile must fail in normalizer before backend",
  );

  const advancedCanonical = {
    "plant.watering.solution.ph": 6.2,
    "plant.watering.solution.ppm": 820,
    "plant.watering.drainage.ph": 6.4,
    "plant.watering.drainage.ppm": 900,
    "plant.watering.nutrients": EXPECTED_WATERING_PAYLOAD.watering.nutrients,
  };
  const advancedPreview = await service.buildPreview({
    profileKey: WATERING_PROFILE_KEY,
    valuesJson: advancedCanonical,
  });
  assert(
    advancedPreview.errors.length === 0,
    "FR-REG-QA-3: Advanced JSON canonical valuesJson must pass buildPreview",
  );
}

async function runQa4(service: RegistryService) {
  const rows = await loadProfileBuildRows(service, DIARY_PROFILE_KEY);
  const profile = await service.getProfileByKey(DIARY_PROFILE_KEY);
  assert(profile, "FR-REG-QA-4: diary.setup.config.v1 must exist");

  assert(
    JSON.stringify(profile.fields.map(field => field.fieldId)) ===
      JSON.stringify(DIARY_FIELD_IDS),
    "FR-REG-QA-4: diary profile fields must match seed",
  );

  const wateringTypeRow = rows.find(row => row.field.fieldId === "diary.setup.watering_type");
  const roomTypeRow = rows.find(row => row.field.fieldId === "diary.setup.room_type");
  assert(
    wateringTypeRow?.field.formatJson?.mode === "select",
    "FR-REG-QA-4: watering_type must use select format for UI",
  );
  assert(
    roomTypeRow?.field.formatJson?.mode === "select",
    "FR-REG-QA-4: room_type must use select format for UI",
  );

  const normalized = buildFromRuntimeInputs(rows, DIARY_RUNTIME_INPUTS);
  assert(
    normalized.errors.length === 0,
    `FR-REG-QA-4: diary normalizer must pass, got ${JSON.stringify(normalized.errors)}`,
  );

  const preview = await service.buildPreview({
    profileKey: DIARY_PROFILE_KEY,
    valuesJson: normalized.valuesJson,
  });
  assert(
    preview.errors.length === 0,
    `FR-REG-QA-4: diary buildPreview must succeed, got ${JSON.stringify(preview.errors)}`,
  );
  assert(
    JSON.stringify(preview.payload) === JSON.stringify(EXPECTED_DIARY_PAYLOAD),
    "FR-REG-QA-4: diary payload must use camelCase canonical paths",
  );

  assert(
    CREATE_DIARY_EVENT_PROFILE_KEY === DIARY_PROFILE_KEY,
    "FR-REG-QA-4: Create Diary Event pilot must reuse diary.setup.config.v1 profileKey",
  );
}

async function main() {
  const prisma = new PrismaClient();
  const service = new RegistryService(prisma as never);

  try {
    await seedRegistryFieldSpecs(prisma);
    await runQa3(service);
    await runQa4(service);
    // eslint-disable-next-line no-console
    console.log("FR-REG-QA-3 + FR-REG-QA-4 smoke passed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
