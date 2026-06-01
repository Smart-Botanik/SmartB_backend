import { PrismaClient, RegistryProfileKind } from "@prisma/client";
import { RegistryService } from "../modules/registry/registry.service";
import {
  PLANT_CREATED_ACTION_PATH,
  PLANT_CREATED_PROFILE_KEY,
  seedRegistryFieldSpecs,
} from "./seed-registry-field-specs";

const PLANT_CREATED_FIELD_IDS = [
  "plant.created.name",
  "plant.created.item_label",
  "plant.created.product_id",
  "plant.created.pot_type",
  "plant.created.pot_size",
  "plant.created.period",
  "plant.created.notes",
] as const;

const PLANT_CREATED_PREVIEW_VALUES = {
  "plant.created.name": "Northern Lights #1",
  "plant.created.item_label": "NL-1",
  "plant.created.product_id": "product-seed-1",
  "plant.created.pot_type": "growBag",
  "plant.created.pot_size": 11.5,
  "plant.created.period": "vegetation",
  "plant.created.notes": "First clone",
} as const;

const PLANT_CREATED_EXPECTED_PAYLOAD = {
  name: "Northern Lights #1",
  itemLabel: "NL-1",
  productId: "product-seed-1",
  potType: "growBag",
  potSize: 11.5,
  period: "vegetation",
  notes: "First clone",
} as const;

const PLANT_CREATED_ACTION_PATH_MAPPING = {
  name: { currentKey: "name", is_state_field: true },
  itemLabel: { currentKey: "itemLabel", is_state_field: true },
  productId: { currentKey: "productId", is_state_field: true },
  potType: { currentKey: "potType", is_state_field: true },
  potSize: { currentKey: "potSize", is_state_field: true },
  period: { currentKey: "period", is_state_field: true },
  notes: { currentKey: "notes", is_state_field: true },
} as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const service = new RegistryService(prisma as never);

  try {
    await seedRegistryFieldSpecs(prisma);

    const profile = await service.getProfileByKey(PLANT_CREATED_PROFILE_KEY);
    assert(profile, "Expected seeded plant.created.v1 profile");
    assert(profile.entity === "Plant", "Expected Plant profile entity");
    assert(
      profile.kind === RegistryProfileKind.event_write,
      "Expected event_write profile kind",
    );
    assert(
      JSON.stringify(profile.fields.map((field) => field.fieldId)) ===
        JSON.stringify(PLANT_CREATED_FIELD_IDS),
      "Expected plant.created.v1 field order from seed",
    );
    assert(
      profile.fields.find((field) => field.fieldId === "plant.created.name")?.required === true,
      "Expected plant.created.name to be required",
    );

    for (const fieldId of PLANT_CREATED_FIELD_IDS) {
      const usage = await service.getFieldSpecUsage(fieldId);
      assert(
        usage.profileKeys.includes(PLANT_CREATED_PROFILE_KEY),
        `Expected ${fieldId} to be linked to plant.created.v1`,
      );

      const fieldRow = await prisma.registryFieldSpec.findUnique({
        where: { fieldId },
        select: { includeInCurrent: true },
      });
      assert(fieldRow?.includeInCurrent === true, `Expected ${fieldId} includeInCurrent=true`);
    }

    const actionPath = await prisma.actionPathRegistry.findUnique({
      where: { actionPath: PLANT_CREATED_ACTION_PATH },
      select: { actionPath: true, targetType: true, mapping: true },
    });
    assert(actionPath, "Expected common.plant.created action path from seed");
    assert(actionPath.targetType === "Plant", "Expected Plant targetType");
    assert(
      typeof actionPath.mapping === "object" && actionPath.mapping !== null,
      "Expected action path mapping object",
    );
    const mapping = actionPath.mapping as Record<
      string,
      { currentKey: string; is_state_field: boolean }
    >;
    for (const [payloadKey, rule] of Object.entries(PLANT_CREATED_ACTION_PATH_MAPPING)) {
      assert(
        JSON.stringify(mapping[payloadKey]) === JSON.stringify(rule),
        `Expected mapping[${payloadKey}]=${JSON.stringify(rule)}, got ${JSON.stringify(mapping[payloadKey])}`,
      );
    }

    const preview = await service.buildPreview({
      profileKey: PLANT_CREATED_PROFILE_KEY,
      valuesJson: { ...PLANT_CREATED_PREVIEW_VALUES },
    });
    assert(
      preview.errors.length === 0,
      `Expected no plant.created preview errors, got ${JSON.stringify(preview.errors)}`,
    );
    assert(
      JSON.stringify(preview.payload) === JSON.stringify(PLANT_CREATED_EXPECTED_PAYLOAD),
      "Expected plant.created preview payload at canonical paths",
    );

    const minimalPreview = await service.buildPreview({
      profileKey: PLANT_CREATED_PROFILE_KEY,
      valuesJson: { "plant.created.name": "Solo plant" },
    });
    assert(
      minimalPreview.errors.length === 0,
      `Expected minimal preview without errors, got ${JSON.stringify(minimalPreview.errors)}`,
    );
    assert(
      JSON.stringify(minimalPreview.payload) === JSON.stringify({ name: "Solo plant" }),
      "Expected minimal payload with name only",
    );

    const missingRequired = await service.buildPreview({
      profileKey: PLANT_CREATED_PROFILE_KEY,
      valuesJson: { "plant.created.item_label": "orphan-label" },
    });
    assert(
      missingRequired.errors.some((error) => error.code === "required"),
      "Expected required error for missing plant.created.name",
    );

    const invalidPotSize = await service.buildPreview({
      profileKey: PLANT_CREATED_PROFILE_KEY,
      valuesJson: {
        "plant.created.name": "Bad pot",
        "plant.created.pot_size": -1,
      },
    });
    assert(
      invalidPotSize.errors.some((error) => error.code === "min"),
      "Expected min constraint error for negative pot_size",
    );

    // eslint-disable-next-line no-console
    console.log("Registry plant.created.v1 E2E smoke passed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
