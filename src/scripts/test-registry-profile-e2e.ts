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
const WATERING_FIELD_IDS = [
  "plant.watering.solution.ph",
  "plant.watering.solution.ppm",
  "plant.watering.drainage.ph",
  "plant.watering.drainage.ppm",
  "plant.watering.nutrients",
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

    // eslint-disable-next-line no-console
    console.log("Registry profile E2E smoke passed");
  } finally {
    await service.setProfileFields({
      profileKey: WATERING_PROFILE_KEY,
      fieldIds: [...WATERING_FIELD_IDS],
      requiredFieldIds: ["plant.watering.solution.ph"],
    });
    await prisma.registryFieldSpec.deleteMany({
      where: { fieldId: { in: [mismatchFieldId, deprecatedFieldId] } },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
