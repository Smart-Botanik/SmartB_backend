import { Role } from "@growing/contracts";
import {
  PrismaClient,
  RegistryFieldSpecStatus,
  RegistryProfileKind,
  RegistrySemanticKind,
  RegistryValueType,
} from "@prisma/client";
import { RegistryService } from "../modules/registry/registry.service";
import { seedRegistryFieldSpecs } from "./seed-registry-field-specs";

const WATERING_PROFILE_KEY = "watering.event.v1";
const WATERING_CHART_PROFILE_KEY = "watering.chart.v1";
const CURRENT_SNAPSHOT_PROFILE_KEY = "current.snapshot.v1";
const WATERING_CHART_FIELD_IDS = [
  "plant.watering.solution.ph",
  "plant.watering.solution.ppm",
  "plant.watering.drainage.ph",
  "plant.watering.drainage.ppm",
] as const;
const WATERING_FIELD_IDS = [
  "plant.watering.solution.ph",
  "plant.watering.solution.ppm",
  "plant.watering.drainage.ph",
  "plant.watering.drainage.ppm",
  "plant.watering.nutrients",
] as const;
const LOCATION_EQUIPMENT_PROFILE_KEY = "location.indoor.equipment.v1";
const LOCATION_EQUIPMENT_FIELD_IDS = [
  "location.indoor.enclosure.product_id",
  "location.indoor.enclosure.width",
  "location.indoor.enclosure.height",
  "location.indoor.enclosure.depth",
  "location.indoor.lighting.vegetation_lamps",
  "location.indoor.lighting.bloom_lamps",
] as const;
const DIARY_SETUP_CONFIG_PROFILE_KEY = "diary.setup.config.v1";
const DIARY_SETUP_CONFIG_FIELD_IDS = [
  "diary.setup.watering_type",
  "diary.setup.room_type",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectRejects(
  action: () => Promise<unknown>,
  expectedMessage: string,
) {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `Expected error containing "${expectedMessage}", got "${error instanceof Error ? error.message : String(error)}"`,
    );
    return;
  }

  throw new Error(`Expected action to reject with "${expectedMessage}"`);
}

async function main() {
  const prisma = new PrismaClient();
  const service = new RegistryService(prisma as never);

  const mismatchFieldId = "diary.registry.profile.e2e";
  const deprecatedFieldId = "plant.registry.profile.deprecated_e2e";
  const deprecateOnlyFieldId = "plant.registry.deprecate.e2e";

  try {
    await seedRegistryFieldSpecs(prisma);

    const profile = await service.getProfileByKey(WATERING_PROFILE_KEY);
    assert(profile, "Expected seeded watering.event.v1 profile");
    assert(profile.entity === "Plant", "Expected Plant profile");
    assert(profile.kind === RegistryProfileKind.event_write, "Expected event_write profile");
    assert(
      JSON.stringify(profile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(WATERING_FIELD_IDS),
      "Expected watering.event.v1 field order from seed",
    );

    const updated = await service.setProfileFields({
      profileKey: WATERING_PROFILE_KEY,
      fieldIds: [...WATERING_FIELD_IDS],
      requiredFieldIds: ["plant.watering.solution.ph"],
    });
    assert(updated, "Expected setProfileFields result");
    assert(
      updated.fields.find((field) => field.fieldId === "plant.watering.solution.ph")?.required ===
        true,
      "Expected solution pH to be required",
    );

    const chartProfile = await service.getProfileByKey(WATERING_CHART_PROFILE_KEY);
    assert(chartProfile, "Expected seeded watering.chart.v1 profile");
    assert(chartProfile.kind === RegistryProfileKind.timeseries_read, "Expected timeseries_read");
    assert(
      JSON.stringify(chartProfile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(WATERING_CHART_FIELD_IDS),
      "Expected watering.chart.v1 numeric slice without nutrients",
    );

    const snapshotProfile = await service.getProfileByKey(CURRENT_SNAPSHOT_PROFILE_KEY);
    assert(snapshotProfile, "Expected seeded current.snapshot.v1 profile");
    assert(snapshotProfile.kind === RegistryProfileKind.snapshot_build, "Expected snapshot_build");
    assert(
      JSON.stringify(snapshotProfile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(WATERING_FIELD_IDS),
      "Expected current.snapshot.v1 to include all includeInCurrent watering fields",
    );

    await prisma.registryFieldSpec.upsert({
      where: { fieldId: mismatchFieldId },
      create: {
        fieldId: mismatchFieldId,
        entity: "Diary",
        label: "Diary mismatch e2e",
        valueType: RegistryValueType.string,
        semanticKind: RegistrySemanticKind.generic,
        canonicalPath: "registry.profile.e2e",
        status: RegistryFieldSpecStatus.active,
      },
      update: {
        entity: "Diary",
        status: RegistryFieldSpecStatus.active,
      },
    });
    await expectRejects(
      () =>
        service.setProfileFields({
          profileKey: WATERING_PROFILE_KEY,
          fieldIds: ["plant.watering.solution.ph", mismatchFieldId],
        }),
      "Field entity mismatch",
    );

    await prisma.registryFieldSpec.upsert({
      where: { fieldId: deprecatedFieldId },
      create: {
        fieldId: deprecatedFieldId,
        entity: "Plant",
        label: "Deprecated Plant e2e",
        valueType: RegistryValueType.string,
        semanticKind: RegistrySemanticKind.generic,
        canonicalPath: "registry.profile.deprecatedE2e",
        status: RegistryFieldSpecStatus.deprecated,
      },
      update: {
        entity: "Plant",
        status: RegistryFieldSpecStatus.deprecated,
      },
    });
    await expectRejects(
      () =>
        service.setProfileFields({
          profileKey: WATERING_PROFILE_KEY,
          fieldIds: ["plant.watering.solution.ph", deprecatedFieldId],
        }),
      "Active profile cannot include deprecated fieldIds",
    );

    const preview = await service.buildPreview({
      profileKey: WATERING_PROFILE_KEY,
      valuesJson: {
        "plant.watering.solution.ph": 6.2,
        "plant.watering.solution.ppm": 820,
        "plant.watering.drainage.ph": 6.4,
        "plant.watering.drainage.ppm": 900,
        "plant.watering.nutrients": [
          {
            productId: "product-1",
            product: "Base Nutrient",
            nutrient_amount: { value: 1.5, unit: "mll" },
          },
        ],
      },
    });

    assert(preview.errors.length === 0, `Expected no preview errors, got ${JSON.stringify(preview.errors)}`);
    assert(
      JSON.stringify(preview.payload) ===
        JSON.stringify({
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
        }),
      "Expected preview payload to follow canonical paths",
    );

    const missingRequired = await service.buildPreview({
      profileKey: WATERING_PROFILE_KEY,
      valuesJson: {},
    });
    assert(
      missingRequired.errors.some((error) => error.code === "required"),
      "Expected required error for missing solution pH",
    );

    const invalidNumber = await service.buildPreview({
      profileKey: WATERING_PROFILE_KEY,
      valuesJson: { "plant.watering.solution.ph": 6.25 },
    });
    assert(
      invalidNumber.errors.some((error) => error.code === "precision" || error.code === "step"),
      "Expected precision or step error for invalid pH",
    );

    const locationProfile = await service.getProfileByKey(LOCATION_EQUIPMENT_PROFILE_KEY);
    assert(locationProfile, "Expected seeded location.indoor.equipment.v1 profile");
    assert(locationProfile.entity === "Location", "Expected Location profile");
    assert(
      JSON.stringify(locationProfile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(LOCATION_EQUIPMENT_FIELD_IDS),
      "Expected location.indoor.equipment.v1 field order from seed",
    );

    const locationPreview = await service.buildPreview({
      profileKey: LOCATION_EQUIPMENT_PROFILE_KEY,
      valuesJson: {
        "location.indoor.enclosure.product_id": "product-growbox-1",
        "location.indoor.enclosure.width": 120,
        "location.indoor.enclosure.height": 200,
        "location.indoor.enclosure.depth": 60,
        "location.indoor.lighting.vegetation_lamps": [
          { label: "Veg LED", productId: "lamp-veg-1", watts: 120 },
        ],
        "location.indoor.lighting.bloom_lamps": [
          { label: "Bloom LED", productId: "lamp-bloom-1", watts: 240 },
        ],
      },
    });

    assert(
      locationPreview.errors.length === 0,
      `Expected no location preview errors, got ${JSON.stringify(locationPreview.errors)}`,
    );
    assert(
      JSON.stringify(locationPreview.payload) ===
        JSON.stringify({
          equipment: {
            enclosure: {
              product_id: "product-growbox-1",
              width: 120,
              height: 200,
              depth: 60,
            },
            lighting: {
              vegetation_lamps: [
                { label: "Veg LED", productId: "lamp-veg-1", watts: 120 },
              ],
              bloom_lamps: [
                { label: "Bloom LED", productId: "lamp-bloom-1", watts: 240 },
              ],
            },
          },
        }),
      "Expected location equipment preview payload to follow canonical paths",
    );

    const diaryProfile = await service.getProfileByKey(DIARY_SETUP_CONFIG_PROFILE_KEY);
    assert(diaryProfile, "Expected seeded diary.setup.config.v1 profile");
    assert(diaryProfile.entity === "Diary", "Expected Diary profile");
    assert(
      JSON.stringify(diaryProfile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(DIARY_SETUP_CONFIG_FIELD_IDS),
      "Expected diary.setup.config.v1 field order from seed",
    );

    const diaryPreview = await service.buildPreview({
      profileKey: DIARY_SETUP_CONFIG_PROFILE_KEY,
      valuesJson: {
        "diary.setup.watering_type": "drip",
        "diary.setup.room_type": "indoor",
      },
    });

    assert(
      diaryPreview.errors.length === 0,
      `Expected no diary preview errors, got ${JSON.stringify(diaryPreview.errors)}`,
    );
    assert(
      JSON.stringify(diaryPreview.payload) ===
        JSON.stringify({
          diary: {
            wateringType: "drip",
            roomType: "indoor",
          },
        }),
      "Expected diary setup preview payload to follow canonical paths",
    );

    await prisma.registryFieldSpec.upsert({
      where: { fieldId: deprecateOnlyFieldId },
      create: {
        fieldId: deprecateOnlyFieldId,
        entity: "Plant",
        label: "Deprecate-only e2e",
        valueType: RegistryValueType.string,
        semanticKind: RegistrySemanticKind.generic,
        canonicalPath: "registry.deprecate.e2e",
        status: RegistryFieldSpecStatus.active,
      },
      update: {
        entity: "Plant",
        status: RegistryFieldSpecStatus.active,
      },
    });

    const orphanUsage = await service.getFieldSpecUsage(deprecateOnlyFieldId);
    assert(orphanUsage.profileCount === 0, "Expected orphan field to have no profiles");
    assert(orphanUsage.isDeprecated === false, "Expected active status before deprecate");

    const deprecatedRow = await service.deprecateFieldSpec(deprecateOnlyFieldId);
    assert(
      deprecatedRow.status === RegistryFieldSpecStatus.deprecated,
      "Expected deprecate mutation to set deprecated status",
    );

    const deprecatedUsage = await service.getFieldSpecUsage(deprecateOnlyFieldId);
    assert(deprecatedUsage.isDeprecated === true, "Expected usage to report deprecated");
    assert(deprecatedUsage.profileCount === 0, "Expected profile count unchanged after deprecate");

    const idempotent = await service.deprecateFieldSpec(deprecateOnlyFieldId);
    assert(
      idempotent.status === RegistryFieldSpecStatus.deprecated,
      "Expected idempotent deprecate to keep deprecated status",
    );

    const phUsage = await service.getFieldSpecUsage("plant.watering.solution.ph");
    assert(phUsage.profileCount >= 1, "Expected solution pH to be used in at least one profile");
    assert(
      phUsage.profileKeys.includes(WATERING_PROFILE_KEY),
      "Expected watering.event.v1 to reference solution pH",
    );

    await expectRejects(
      () => service.getFieldSpecUsage("plant.registry.nonexistent.e2e"),
      "Registry field spec not found",
    );

    const diaryProfileForUser = await service.getProfileByKey(
      DIARY_SETUP_CONFIG_PROFILE_KEY,
      Role.USER,
    );
    assert(diaryProfileForUser, "Expected USER to read diary.setup.config.v1 profile");
    assert(
      diaryProfileForUser.fields.map((field) => field.fieldId).join(",") ===
        DIARY_SETUP_CONFIG_FIELD_IDS.join(","),
      "Expected diary.setup.config.v1 field order for USER",
    );

    const diaryFieldSpecsForUser = await service.listFieldSpecs({
      entity: "Diary",
      role: Role.USER,
    });
    assert(
      diaryFieldSpecsForUser.length === DIARY_SETUP_CONFIG_FIELD_IDS.length,
      "Expected USER Diary field spec slice",
    );

    const adminOnlyProfile = await service.getProfileByKey(
      WATERING_CHART_PROFILE_KEY,
      Role.USER,
    );
    assert(adminOnlyProfile === null, "Expected USER to be denied watering.chart.v1 profile");

    // eslint-disable-next-line no-console
    console.log("Registry profile E2E smoke passed");
  } finally {
    await service.setProfileFields({
      profileKey: WATERING_PROFILE_KEY,
      fieldIds: [...WATERING_FIELD_IDS],
      requiredFieldIds: ["plant.watering.solution.ph"],
    });
    await prisma.registryFieldSpec.deleteMany({
      where: {
        fieldId: { in: [mismatchFieldId, deprecatedFieldId, deprecateOnlyFieldId] },
      },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
