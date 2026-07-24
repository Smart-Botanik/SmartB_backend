"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const registry_service_1 = require("../modules/registry/registry.service");
const seed_registry_field_specs_1 = require("./seed-registry-field-specs");
const TEMPERATURE_PATTERN_KEY = "temperature.decimal.v1";
const QA_TEMP_FIELD_ID = "plant.qa.temperature.fr_reg_qa_1";
const QA_DEPRECATE_FIELD_ID = "plant.qa.deprecate.fr_reg_qa_1";
const PLANT_PROFILE_KEYS = [
    "watering.event.v1",
    "watering.chart.v1",
    "current.snapshot.v1",
];
const DIARY_PROFILE_KEY = "diary.setup.config.v1";
const LOCATION_PROFILE_KEY = "location.indoor.equipment.v1";
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function runQa1(service, prisma) {
    const patterns = await service.listFieldPatterns({ isActive: true });
    const temperaturePattern = patterns.find(pattern => pattern.key === TEMPERATURE_PATTERN_KEY);
    assert(temperaturePattern, "FR-REG-QA-1: temperature.decimal.v1 pattern must exist");
    assert(temperaturePattern.allowedUnits?.includes("C") &&
        temperaturePattern.allowedUnits?.includes("F"), "FR-REG-QA-1: temperature pattern must allow C/F units");
    assert(temperaturePattern.conversionProfile === "temperature_c_f", "FR-REG-QA-1: temperature pattern must define conversionProfile");
    const patternRow = await prisma.registryFieldPattern.findUnique({
        where: { key: TEMPERATURE_PATTERN_KEY },
        select: { id: true },
    });
    assert(patternRow, "FR-REG-QA-1: temperature pattern row missing in DB");
    await prisma.registryFieldSpec.upsert({
        where: { fieldId: QA_TEMP_FIELD_ID },
        create: {
            fieldId: QA_TEMP_FIELD_ID,
            entity: "Plant",
            label: "QA temperature field",
            valueType: client_1.RegistryValueType.number,
            semanticKind: client_1.RegistrySemanticKind.temperature,
            unit: "C",
            canonicalPath: "qa.temperature",
            fieldPatternId: patternRow.id,
            formatJson: { mode: "decimal", precision: 1, step: 0.1 },
            constraintsJson: { min: -50, max: 120 },
            status: client_1.RegistryFieldSpecStatus.active,
        },
        update: {
            entity: "Plant",
            label: "QA temperature field",
            valueType: client_1.RegistryValueType.number,
            semanticKind: client_1.RegistrySemanticKind.temperature,
            unit: "C",
            canonicalPath: "qa.temperature",
            fieldPatternId: patternRow.id,
            formatJson: { mode: "decimal", precision: 1, step: 0.1 },
            constraintsJson: { min: -50, max: 120 },
            status: client_1.RegistryFieldSpecStatus.active,
        },
    });
    const qaField = (await service.listFieldSpecs({ entity: "Plant", status: "active" })).find(row => row.fieldId === QA_TEMP_FIELD_ID);
    assert(qaField, "FR-REG-QA-1: QA temperature field visible in active catalog");
    assert(qaField.fieldPatternKey === TEMPERATURE_PATTERN_KEY, "FR-REG-QA-1: QA field must inherit temperature pattern");
    const format = qaField.formatJson;
    assert(format?.mode === "decimal", "FR-REG-QA-1: structured decimal format must persist");
    const phUsage = await service.getFieldSpecUsage("plant.watering.solution.ph");
    assert(phUsage.profileCount >= 1, "FR-REG-QA-1: usage must report profile references");
    assert(phUsage.profileKeys.includes("watering.event.v1"), "FR-REG-QA-1: usage must include watering.event.v1 for in-profile field");
    await prisma.registryFieldSpec.upsert({
        where: { fieldId: QA_DEPRECATE_FIELD_ID },
        create: {
            fieldId: QA_DEPRECATE_FIELD_ID,
            entity: "Plant",
            label: "QA deprecate orphan",
            valueType: client_1.RegistryValueType.string,
            semanticKind: client_1.RegistrySemanticKind.generic,
            canonicalPath: "qa.deprecate",
            status: client_1.RegistryFieldSpecStatus.active,
        },
        update: {
            entity: "Plant",
            status: client_1.RegistryFieldSpecStatus.active,
        },
    });
    const orphanUsage = await service.getFieldSpecUsage(QA_DEPRECATE_FIELD_ID);
    assert(orphanUsage.profileCount === 0, "FR-REG-QA-1: orphan field must have zero profiles");
    await service.deprecateFieldSpec(QA_DEPRECATE_FIELD_ID);
    const activePlantFields = await service.listFieldSpecs({
        entity: "Plant",
        status: client_1.RegistryFieldSpecStatus.active,
    });
    assert(!activePlantFields.some(row => row.fieldId === QA_DEPRECATE_FIELD_ID), "FR-REG-QA-1: deprecated field must be hidden from active-only picker");
    const deprecatedFields = await service.listFieldSpecs({
        entity: "Plant",
        status: client_1.RegistryFieldSpecStatus.deprecated,
    });
    assert(deprecatedFields.some(row => row.fieldId === QA_DEPRECATE_FIELD_ID), "FR-REG-QA-1: deprecated filter must return deprecated field");
    const deprecatedUsage = await service.getFieldSpecUsage(QA_DEPRECATE_FIELD_ID);
    assert(deprecatedUsage.isDeprecated, "FR-REG-QA-1: usage must report deprecated status");
}
async function runQa2(service) {
    const plantProfiles = await service.listProfiles({ entity: "Plant", isActive: true });
    const plantProfileKeys = plantProfiles.map(profile => profile.key);
    for (const key of PLANT_PROFILE_KEYS) {
        assert(plantProfileKeys.includes(key), `FR-REG-QA-2: Plant profile ${key} must exist`);
    }
    const plantFields = await service.listFieldSpecs({
        entity: "Plant",
        status: client_1.RegistryFieldSpecStatus.active,
    });
    assert(plantFields.length >= 5, "FR-REG-QA-2: Plant catalog must include watering baseline");
    assert(plantFields.every(row => row.entity === "Plant"), "FR-REG-QA-2: Plant entity filter must not leak other entities");
    assert(plantFields.some(row => row.fieldId.startsWith("plant.watering.")), "FR-REG-QA-2: Plant scope must include plant.watering.* field specs");
    const diaryProfiles = await service.listProfiles({ entity: "Diary", isActive: true });
    assert(diaryProfiles.some(profile => profile.key === DIARY_PROFILE_KEY), "FR-REG-QA-2: Diary profile diary.setup.config.v1 must exist");
    const diaryFields = await service.listFieldSpecs({
        entity: "Diary",
        status: client_1.RegistryFieldSpecStatus.active,
    });
    assert(diaryFields.every(row => row.fieldId.startsWith("diary.setup.")), "FR-REG-QA-2: Diary scope must expose diary.setup.* field specs only");
    const locationProfiles = await service.listProfiles({ entity: "Location", isActive: true });
    assert(locationProfiles.some(profile => profile.key === LOCATION_PROFILE_KEY), "FR-REG-QA-2: Location profile location.indoor.equipment.v1 must exist");
    const locationFields = await service.listFieldSpecs({
        entity: "Location",
        status: client_1.RegistryFieldSpecStatus.active,
    });
    assert(locationFields.length >= 1, "FR-REG-QA-2: Location catalog must not be empty");
    assert(locationFields.every(row => row.entity === "Location"), "FR-REG-QA-2: Location entity filter must isolate Location field specs");
}
async function main() {
    const prisma = new client_1.PrismaClient();
    const service = new registry_service_1.RegistryService(prisma);
    try {
        await (0, seed_registry_field_specs_1.seedRegistryFieldSpecs)(prisma);
        await runQa1(service, prisma);
        await runQa2(service);
        console.log("FR-REG-QA-1 + FR-REG-QA-2 smoke passed");
    }
    finally {
        await prisma.registryFieldSpec.deleteMany({
            where: { fieldId: { in: [QA_TEMP_FIELD_ID, QA_DEPRECATE_FIELD_ID] } },
        });
        await prisma.$disconnect();
    }
}
main().catch(error => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=test-registry-qa-fr-reg-qa-1-2.js.map