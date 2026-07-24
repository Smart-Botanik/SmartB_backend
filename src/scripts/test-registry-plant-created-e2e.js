"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const registry_service_1 = require("../modules/registry/registry.service");
const seed_registry_field_specs_1 = require("./seed-registry-field-specs");
const PLANT_CREATED_FIELD_IDS = [
    "plant.created.name",
    "plant.created.item_label",
    "plant.created.product_id",
    "plant.created.pot_type",
    "plant.created.pot_size",
    "plant.created.pot.width",
    "plant.created.pot.height",
    "plant.created.bed.width",
    "plant.created.bed.height",
    "plant.created.period",
    "plant.created.planting.date",
    "plant.created.notes",
];
const PLANT_CREATED_PREVIEW_VALUES = {
    "plant.created.name": "Northern Lights #1",
    "plant.created.item_label": "NL-1",
    "plant.created.product_id": "product-seed-1",
    "plant.created.pot_type": "growBag",
    "plant.created.pot_size": 11.5,
    "plant.created.pot.width": 30,
    "plant.created.pot.height": 30,
    "plant.created.bed.width": 45,
    "plant.created.bed.height": 60,
    "plant.created.period": "vegetation",
    "plant.created.planting.date": "2026-05-20",
    "plant.created.notes": "First clone",
};
const PLANT_CREATED_EXPECTED_PAYLOAD = {
    name: "Northern Lights #1",
    itemLabel: "NL-1",
    productId: "product-seed-1",
    pot: { type: "growBag", size: 11.5, width: 30, height: 30 },
    bed: { width: 45, height: 60 },
    period: "vegetation",
    planting: { date: "2026-05-20" },
    notes: "First clone",
};
const PLANT_CREATED_ACTION_PATH_MAPPING = {
    name: { currentKey: "name", is_state_field: true },
    itemLabel: { currentKey: "itemLabel", is_state_field: true },
    productId: { currentKey: "productId", is_state_field: true },
    "pot.type": { currentKey: "pot.type", is_state_field: true },
    "pot.size": { currentKey: "pot.size", is_state_field: true },
    "pot.width": { currentKey: "pot.width", is_state_field: true },
    "pot.height": { currentKey: "pot.height", is_state_field: true },
    "bed.width": { currentKey: "bed.width", is_state_field: true },
    "bed.height": { currentKey: "bed.height", is_state_field: true },
    period: { currentKey: "period", is_state_field: true },
    "planting.date": { currentKey: "planting.date", is_state_field: true },
    notes: { currentKey: "notes", is_state_field: true },
};
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function main() {
    const prisma = new client_1.PrismaClient();
    const service = new registry_service_1.RegistryService(prisma);
    try {
        await (0, seed_registry_field_specs_1.seedRegistryFieldSpecs)(prisma);
        const profile = await service.getProfileByKey(seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY);
        assert(profile, "Expected seeded plant.created.v1 profile");
        assert(profile.entity === "Plant", "Expected Plant profile entity");
        assert(profile.kind === client_1.RegistryProfileKind.event_write, "Expected event_write profile kind");
        assert(JSON.stringify(profile.fields.map((field) => field.fieldId)) ===
            JSON.stringify(PLANT_CREATED_FIELD_IDS), "Expected plant.created.v1 field order from seed");
        assert(profile.fields.find((field) => field.fieldId === "plant.created.name")?.required === true, "Expected plant.created.name to be required");
        for (const fieldId of PLANT_CREATED_FIELD_IDS) {
            const usage = await service.getFieldSpecUsage(fieldId);
            assert(usage.profileKeys.includes(seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY), `Expected ${fieldId} to be linked to plant.created.v1`);
            const fieldRow = await prisma.registryFieldSpec.findUnique({
                where: { fieldId },
                select: { includeInCurrent: true },
            });
            assert(fieldRow?.includeInCurrent === true, `Expected ${fieldId} includeInCurrent=true`);
        }
        const actionPath = await prisma.actionPathRegistry.findUnique({
            where: { actionPath: seed_registry_field_specs_1.PLANT_CREATED_ACTION_PATH },
            select: { actionPath: true, targetType: true, mapping: true },
        });
        assert(actionPath, "Expected common.plant.created action path from seed");
        assert(actionPath.targetType === "Plant", "Expected Plant targetType");
        assert(typeof actionPath.mapping === "object" && actionPath.mapping !== null, "Expected action path mapping object");
        const mapping = actionPath.mapping;
        for (const [payloadKey, rule] of Object.entries(PLANT_CREATED_ACTION_PATH_MAPPING)) {
            assert(JSON.stringify(mapping[payloadKey]) === JSON.stringify(rule), `Expected mapping[${payloadKey}]=${JSON.stringify(rule)}, got ${JSON.stringify(mapping[payloadKey])}`);
        }
        const preview = await service.buildPreview({
            profileKey: seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY,
            valuesJson: { ...PLANT_CREATED_PREVIEW_VALUES },
        });
        assert(preview.errors.length === 0, `Expected no plant.created preview errors, got ${JSON.stringify(preview.errors)}`);
        assert(JSON.stringify(preview.payload) === JSON.stringify(PLANT_CREATED_EXPECTED_PAYLOAD), "Expected plant.created preview payload at canonical paths");
        const minimalPreview = await service.buildPreview({
            profileKey: seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY,
            valuesJson: { "plant.created.name": "Solo plant" },
        });
        assert(minimalPreview.errors.length === 0, `Expected minimal preview without errors, got ${JSON.stringify(minimalPreview.errors)}`);
        assert(JSON.stringify(minimalPreview.payload) === JSON.stringify({ name: "Solo plant" }), "Expected minimal payload with name only");
        const missingRequired = await service.buildPreview({
            profileKey: seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY,
            valuesJson: { "plant.created.item_label": "orphan-label" },
        });
        assert(missingRequired.errors.some((error) => error.code === "required"), "Expected required error for missing plant.created.name");
        const invalidPotSize = await service.buildPreview({
            profileKey: seed_registry_field_specs_1.PLANT_CREATED_PROFILE_KEY,
            valuesJson: {
                "plant.created.name": "Bad pot",
                "plant.created.pot_size": -1,
            },
        });
        assert(invalidPotSize.errors.some((error) => error.code === "min"), "Expected min constraint error for negative pot_size");
        console.log("Registry plant.created.v1 E2E smoke passed");
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=test-registry-plant-created-e2e.js.map