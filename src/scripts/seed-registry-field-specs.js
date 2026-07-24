"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANT_CREATED_ACTION_PATH = exports.PLANT_CREATED_PROFILE_KEY = exports.DIARY_SETUP_CONFIG_ACTION_PATH = void 0;
exports.seedRegistryFieldSpecs = seedRegistryFieldSpecs;
const client_1 = require("@prisma/client");
const FIELD_PATTERNS = [
    {
        key: "reference.string.v1",
        title: "Reference string",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        formatJson: {
            mode: "reference",
            idType: "string",
        },
    },
    {
        key: "product.reference.v1",
        title: "Product reference",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
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
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.ph,
        canonicalUnit: "pH",
        allowedUnits: ["pH"],
        defaultInputUnit: "pH",
        formatJson: { mode: "decimal", precision: 1, step: 0.1 },
        constraintsJson: { min: 0, max: 14 },
    },
    {
        key: "ppm.integer.v1",
        title: "PPM integer",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.ppm,
        canonicalUnit: "ppm",
        allowedUnits: ["ppm"],
        defaultInputUnit: "ppm",
        formatJson: { mode: "integer", step: 1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "temperature.decimal.v1",
        title: "Temperature decimal",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.temperature,
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
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.concentration,
        canonicalUnit: "mll",
        allowedUnits: ["mll", "mlg", "tspl"],
        defaultInputUnit: "mll",
        formatJson: { mode: "decimal", precision: 2, step: 0.1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "length.cm.decimal.v1",
        title: "Length in centimeters",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.length,
        canonicalUnit: "cm",
        allowedUnits: ["cm"],
        defaultInputUnit: "cm",
        formatJson: { mode: "decimal", precision: 1, step: 0.1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "length.mm.integer.v1",
        title: "Length in millimeters",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.length,
        canonicalUnit: "mm",
        allowedUnits: ["mm"],
        defaultInputUnit: "mm",
        formatJson: { mode: "integer", step: 1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "power.watt.integer.v1",
        title: "Power in watts",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.generic,
        canonicalUnit: "W",
        allowedUnits: ["W"],
        defaultInputUnit: "W",
        formatJson: { mode: "integer", step: 1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "volume.l_g.decimal.v1",
        title: "Volume in liters / gallons",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.generic,
        canonicalUnit: "L",
        allowedUnits: ["L", "G"],
        defaultInputUnit: "L",
        conversionProfile: "volume.l_g.us.v1",
        formatJson: { mode: "decimal", precision: 1, step: 0.1 },
        constraintsJson: { min: 0 },
    },
    {
        key: "equipment.lamp-array.json.v1",
        title: "Equipment lamp array",
        valueType: client_1.RegistryValueType.json,
        semanticKind: client_1.RegistrySemanticKind.generic,
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
const PLANT_FIELD_SPECS = [
    {
        fieldId: "plant.watering.solution.ph",
        label: "Solution pH",
        canonicalPath: "watering.solution.ph",
        semanticKind: client_1.RegistrySemanticKind.ph,
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
        semanticKind: client_1.RegistrySemanticKind.ppm,
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
        semanticKind: client_1.RegistrySemanticKind.ph,
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
        semanticKind: client_1.RegistrySemanticKind.ppm,
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
        valueType: client_1.RegistryValueType.json,
        semanticKind: client_1.RegistrySemanticKind.generic,
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
const CLIMATE_OBSERVATION_PROFILE_KEY = "climate.observation.event.v1";
const SIZE_OBSERVATION_PROFILE_KEY = "size.observation.event.v1";
const HEALTH_TREATMENT_PROFILE_KEY = "health.treatment.event.v1";
const HEALTH_RESOLVE_PROFILE_KEY = "health.resolve.event.v1";
const HEALTH_UPDATE_PROFILE_KEY = "health.update.event.v1";
const PERIOD_CHANGE_PROFILE_KEY = "period.change.event.v1";
const HEALTH_TREATMENT_PRODUCT_OPTIONS = [
    "Deficiency_N",
    "Deficiency_P",
    "Deficiency_K",
    "Deficiency_Ca_Mg",
    "Deficiency_Micro",
    "Pest_Spider_Mite",
    "Pest_Aphids",
    "Pest_Gnat",
    "Pest_Thrips",
    "Disease_Mold",
    "Disease_Mildew",
    "Disease_Root_Rot",
    "Env_Light_Burn",
    "Env_Heat_Stress",
    "Env_Overwatering",
    "Env_Drought",
    "Nutrient_Lockout",
    "Nutrient_Burn",
];
const PLANT_EVENT_EXTENSION_FIELD_SPECS = [
    {
        fieldId: "plant.climate.temperature",
        label: "Температура",
        canonicalPath: "climate.temperature.celsius",
        semanticKind: client_1.RegistrySemanticKind.temperature,
        patternKey: "temperature.decimal.v1",
        unit: "C",
        required: false,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.climate.humidity",
        label: "Влажность (%)",
        canonicalPath: "climate.humidityPct",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
        formatJson: { mode: "decimal", precision: 1, step: 1 },
        constraintsJson: { min: 0, max: 100 },
    },
    {
        fieldId: "plant.climate.light_schedule_hours",
        label: "Световой день (ч)",
        canonicalPath: "climate.lightScheduleHours",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
        formatJson: { mode: "integer", step: 1 },
        constraintsJson: { min: 0, max: 24 },
    },
    {
        fieldId: "plant.climate.notes",
        label: "Заметка (среда)",
        canonicalPath: "climate.notes",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.observation.height_mm",
        label: "Рост (мм)",
        canonicalPath: "observation.heightMm",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.mm.integer.v1",
        unit: "mm",
        required: true,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.observation.notes",
        label: "Заметка (замер)",
        canonicalPath: "observation.notes",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.treatment.product",
        label: "Категория проблемы",
        canonicalPath: "treatment.product",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: true,
        includeInCurrent: false,
        formatJson: {
            mode: "select",
            options: [...HEALTH_TREATMENT_PRODUCT_OPTIONS],
        },
    },
    {
        fieldId: "plant.treatment.method",
        label: "Лечение (метод)",
        canonicalPath: "treatment.method",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.treatment.notes",
        label: "Заметки (здоровье)",
        canonicalPath: "treatment.notes",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
    },
    {
        fieldId: "plant.period.phase",
        label: "Фаза",
        canonicalPath: "period.phase",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: true,
        includeInCurrent: false,
        formatJson: {
            mode: "select",
            options: [
                "germination",
                "vegetation",
                "bloom",
                "preharvest",
                "harvest",
                "flushing",
                "drying",
                "dormancy",
            ],
        },
    },
    {
        fieldId: "plant.period.period_days",
        label: "Дней в фазе",
        canonicalPath: "period.periodDays",
        valueType: client_1.RegistryValueType.number,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: false,
        formatJson: { mode: "integer", step: 1 },
        constraintsJson: { min: 0 },
    },
];
const WATERING_EVENT_PROFILE_KEY = "watering.event.v1";
const WATERING_CHART_PROFILE_KEY = "watering.chart.v1";
const CURRENT_SNAPSHOT_PROFILE_KEY = "current.snapshot.v1";
const LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY = "location.indoor.equipment.v1";
const DIARY_SETUP_CONFIG_PROFILE_KEY = "diary.setup.config.v1";
exports.DIARY_SETUP_CONFIG_ACTION_PATH = "diary.setup.config";
exports.PLANT_CREATED_PROFILE_KEY = "plant.created.v1";
exports.PLANT_CREATED_ACTION_PATH = "common.plant.created";
const PLANT_CREATED_FIELD_SPECS = [
    {
        fieldId: "plant.created.name",
        label: "Название",
        canonicalPath: "name",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: true,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.item_label",
        label: "Метка",
        canonicalPath: "itemLabel",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.product_id",
        label: "Продукт",
        canonicalPath: "productId",
        semanticKind: client_1.RegistrySemanticKind.generic,
        patternKey: "product.reference.v1",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.pot_type",
        label: "Тип горшка",
        canonicalPath: "pot.type",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
        formatJson: {
            mode: "select",
            options: ["growBag", "airPot", "standart", "plastic"],
        },
    },
    {
        fieldId: "plant.created.pot_size",
        label: "Объём горшка",
        canonicalPath: "pot.size",
        semanticKind: client_1.RegistrySemanticKind.generic,
        patternKey: "volume.l_g.decimal.v1",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.pot.width",
        label: "Ширина горшка",
        canonicalPath: "pot.width",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.pot.height",
        label: "Длина горшка",
        canonicalPath: "pot.height",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.bed.width",
        label: "Ширина места",
        canonicalPath: "bed.width",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.bed.height",
        label: "Длина места",
        canonicalPath: "bed.height",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.period",
        label: "Период",
        canonicalPath: "period",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
        formatJson: {
            mode: "select",
            options: ["germination", "vegetation", "bloom", "preharvest", "harvest"],
        },
    },
    {
        fieldId: "plant.created.planting.date",
        label: "Дата посадки",
        canonicalPath: "planting.date",
        valueType: client_1.RegistryValueType.date,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "plant.created.notes",
        label: "Заметка",
        canonicalPath: "notes",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
    },
];
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
const DIARY_SETUP_CONFIG_FIELD_SPECS = [
    {
        fieldId: "diary.setup.watering_type",
        label: "Diary watering type",
        canonicalPath: "diary.wateringType",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
        formatJson: {
            mode: "select",
            options: ["manual", "drip", "hydroponics", "aeroponics"],
        },
    },
    {
        fieldId: "diary.setup.room_type",
        label: "Diary room type",
        canonicalPath: "diary.roomType",
        valueType: client_1.RegistryValueType.string,
        semanticKind: client_1.RegistrySemanticKind.generic,
        required: false,
        includeInCurrent: true,
        formatJson: {
            mode: "select",
            options: ["indoor", "outdoor", "greenhouse"],
        },
    },
];
const DIARY_SETUP_CONFIG_ACTION_PATH_MAPPING = {
    "diary.wateringType": { currentKey: "watering_type", is_state_field: true },
    "diary.roomType": { currentKey: "room_type", is_state_field: true },
};
const LOCATION_INDOOR_EQUIPMENT_FIELD_SPECS = [
    {
        fieldId: "location.indoor.enclosure.product_id",
        label: "Indoor enclosure product",
        canonicalPath: "equipment.enclosure.product_id",
        semanticKind: client_1.RegistrySemanticKind.generic,
        patternKey: "product.reference.v1",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "location.indoor.enclosure.width",
        label: "Indoor enclosure width",
        canonicalPath: "equipment.enclosure.width",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "location.indoor.enclosure.height",
        label: "Indoor enclosure height",
        canonicalPath: "equipment.enclosure.height",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "location.indoor.enclosure.depth",
        label: "Indoor enclosure depth",
        canonicalPath: "equipment.enclosure.depth",
        semanticKind: client_1.RegistrySemanticKind.length,
        patternKey: "length.cm.decimal.v1",
        unit: "cm",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "location.indoor.lighting.vegetation_lamps",
        label: "Vegetation lamps",
        canonicalPath: "equipment.lighting.vegetation_lamps",
        semanticKind: client_1.RegistrySemanticKind.generic,
        patternKey: "equipment.lamp-array.json.v1",
        required: false,
        includeInCurrent: true,
    },
    {
        fieldId: "location.indoor.lighting.bloom_lamps",
        label: "Bloom lamps",
        canonicalPath: "equipment.lighting.bloom_lamps",
        semanticKind: client_1.RegistrySemanticKind.generic,
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
];
const toInputJsonValue = (value) => {
    if (!value) {
        return undefined;
    }
    return value;
};
async function seedRegistryFieldSpecs(prisma) {
    for (const pattern of FIELD_PATTERNS) {
        await prisma.registryFieldPattern.upsert({
            where: { key: pattern.key },
            create: {
                key: pattern.key,
                title: pattern.title,
                valueType: pattern.valueType,
                semanticKind: pattern.semanticKind,
                canonicalUnit: pattern.canonicalUnit,
                allowedUnitsJson: pattern.allowedUnits,
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
                allowedUnitsJson: pattern.allowedUnits,
                defaultInputUnit: pattern.defaultInputUnit,
                conversionProfile: pattern.conversionProfile,
                formatJson: toInputJsonValue(pattern.formatJson),
                constraintsJson: toInputJsonValue(pattern.constraintsJson),
                isActive: true,
            },
        });
    }
    const fieldIds = [];
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
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            update: {
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
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
            kind: client_1.RegistryProfileKind.event_write,
            title: "Watering event v1",
            description: "Canonical profile for watering event payload assembly in v1.",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Plant",
            kind: client_1.RegistryProfileKind.event_write,
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
    const chartFieldSpecIds = fieldIds.slice(0, 4);
    const chartProfile = await prisma.registryProfile.upsert({
        where: { key: WATERING_CHART_PROFILE_KEY },
        create: {
            key: WATERING_CHART_PROFILE_KEY,
            entity: "Plant",
            kind: client_1.RegistryProfileKind.timeseries_read,
            title: "Watering chart v1",
            description: "Timeseries read profile for watering metrics (pH/PPM solution + drainage) in charts.",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Plant",
            kind: client_1.RegistryProfileKind.timeseries_read,
            title: "Watering chart v1",
            description: "Timeseries read profile for watering metrics (pH/PPM solution + drainage) in charts.",
            isActive: true,
        },
        select: { id: true },
    });
    await prisma.registryProfileField.deleteMany({
        where: { profileId: chartProfile.id },
    });
    await prisma.registryProfileField.createMany({
        data: chartFieldSpecIds.map((fieldSpecId, index) => ({
            profileId: chartProfile.id,
            fieldSpecId,
            position: index,
            required: false,
        })),
        skipDuplicates: true,
    });
    const snapshotProfile = await prisma.registryProfile.upsert({
        where: { key: CURRENT_SNAPSHOT_PROFILE_KEY },
        create: {
            key: CURRENT_SNAPSHOT_PROFILE_KEY,
            entity: "Plant",
            kind: client_1.RegistryProfileKind.snapshot_build,
            title: "Plant current snapshot v1",
            description: "Snapshot build profile: fields with includeInCurrent for Plant.current materialization.",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Plant",
            kind: client_1.RegistryProfileKind.snapshot_build,
            title: "Plant current snapshot v1",
            description: "Snapshot build profile: fields with includeInCurrent for Plant.current materialization.",
            isActive: true,
        },
        select: { id: true },
    });
    await prisma.registryProfileField.deleteMany({
        where: { profileId: snapshotProfile.id },
    });
    await prisma.registryProfileField.createMany({
        data: fieldIds.map((fieldSpecId, index) => ({
            profileId: snapshotProfile.id,
            fieldSpecId,
            position: index,
            required: false,
        })),
        skipDuplicates: true,
    });
    const locationEquipmentFieldIds = [];
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
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            update: {
                entity: "Location",
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
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
            kind: client_1.RegistryProfileKind.event_write,
            title: "Location indoor equipment v1",
            description: "Canonical profile for indoor Location equipment payload assembly in v1.",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Location",
            kind: client_1.RegistryProfileKind.event_write,
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
    const diarySetupConfigFieldIds = [];
    for (const field of DIARY_SETUP_CONFIG_FIELD_SPECS) {
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
                entity: "Diary",
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.string,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            update: {
                entity: "Diary",
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.string,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            select: { id: true },
        });
        diarySetupConfigFieldIds.push(saved.id);
    }
    const diarySetupConfigProfile = await prisma.registryProfile.upsert({
        where: { key: DIARY_SETUP_CONFIG_PROFILE_KEY },
        create: {
            key: DIARY_SETUP_CONFIG_PROFILE_KEY,
            entity: "Diary",
            kind: client_1.RegistryProfileKind.event_write,
            title: "Diary setup config v1",
            description: "Canonical profile for Diary setup configuration payload assembly in v1.",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Diary",
            kind: client_1.RegistryProfileKind.event_write,
            title: "Diary setup config v1",
            description: "Canonical profile for Diary setup configuration payload assembly in v1.",
            isActive: true,
        },
        select: { id: true },
    });
    await prisma.registryProfileField.deleteMany({
        where: { profileId: diarySetupConfigProfile.id },
    });
    await prisma.registryProfileField.createMany({
        data: diarySetupConfigFieldIds.map((fieldSpecId, index) => ({
            profileId: diarySetupConfigProfile.id,
            fieldSpecId,
            position: index,
            required: false,
        })),
        skipDuplicates: true,
    });
    const plantCreatedFieldIds = [];
    for (const field of PLANT_CREATED_FIELD_SPECS) {
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
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.string,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            update: {
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.string,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            select: { id: true },
        });
        plantCreatedFieldIds.push(saved.id);
    }
    const plantCreatedProfile = await prisma.registryProfile.upsert({
        where: { key: exports.PLANT_CREATED_PROFILE_KEY },
        create: {
            key: exports.PLANT_CREATED_PROFILE_KEY,
            entity: "Plant",
            kind: client_1.RegistryProfileKind.event_write,
            title: "Plant created v1",
            description: "Стартовые характеристики растения при создании (common.plant.created).",
            version: 1,
            isActive: true,
        },
        update: {
            entity: "Plant",
            kind: client_1.RegistryProfileKind.event_write,
            title: "Plant created v1",
            description: "Стартовые характеристики растения при создании (common.plant.created).",
            isActive: true,
        },
        select: { id: true },
    });
    await prisma.registryProfileField.deleteMany({
        where: { profileId: plantCreatedProfile.id },
    });
    await prisma.registryProfileField.createMany({
        data: plantCreatedFieldIds.map((fieldSpecId, index) => ({
            profileId: plantCreatedProfile.id,
            fieldSpecId,
            position: index,
            required: index === 0,
        })),
        skipDuplicates: true,
    });
    const plantEventExtensionFieldIdByKey = new Map();
    for (const field of PLANT_EVENT_EXTENSION_FIELD_SPECS) {
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
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            update: {
                label: field.label,
                valueType: pattern?.valueType ?? field.valueType ?? client_1.RegistryValueType.number,
                semanticKind: field.semanticKind,
                unit: field.unit,
                canonicalPath: field.canonicalPath,
                required: field.required ?? false,
                includeInCurrent: field.includeInCurrent ?? false,
                formatJson: toInputJsonValue(field.formatJson),
                constraintsJson: toInputJsonValue(field.constraintsJson),
                fieldPatternId: pattern?.id,
                status: client_1.RegistryFieldSpecStatus.active,
            },
            select: { id: true, fieldId: true },
        });
        plantEventExtensionFieldIdByKey.set(saved.fieldId, saved.id);
    }
    const plantEventWriteProfiles = [
        {
            key: CLIMATE_OBSERVATION_PROFILE_KEY,
            title: "Climate observation event v1",
            description: "Plant environment climate observation (plant.environment.climate_observation).",
            fieldIds: [
                "plant.climate.temperature",
                "plant.climate.humidity",
                "plant.climate.light_schedule_hours",
                "plant.climate.notes",
            ],
        },
        {
            key: SIZE_OBSERVATION_PROFILE_KEY,
            title: "Size observation event v1",
            description: "Plant size observation (plant.environment.size_observation).",
            fieldIds: ["plant.observation.height_mm", "plant.observation.notes"],
            requiredFieldId: "plant.observation.height_mm",
        },
        {
            key: HEALTH_TREATMENT_PROFILE_KEY,
            title: "Health treatment event v1",
            description: "Plant health treatment (plant.health.treatment).",
            fieldIds: [
                "plant.treatment.product",
                "plant.treatment.method",
                "plant.treatment.notes",
            ],
            requiredFieldId: "plant.treatment.product",
        },
        {
            key: HEALTH_RESOLVE_PROFILE_KEY,
            title: "Health resolve event v1",
            description: "Plant health issue resolved (plant.health.resolve).",
            fieldIds: ["plant.treatment.product", "plant.treatment.notes"],
            requiredFieldId: "plant.treatment.product",
        },
        {
            key: HEALTH_UPDATE_PROFILE_KEY,
            title: "Health update event v1",
            description: "Plant health treatment update (plant.health.update).",
            fieldIds: [
                "plant.treatment.product",
                "plant.treatment.method",
                "plant.treatment.notes",
            ],
            requiredFieldId: "plant.treatment.product",
        },
        {
            key: PERIOD_CHANGE_PROFILE_KEY,
            title: "Period change event v1",
            description: "Plant growth period change (plant.growth.period_change).",
            fieldIds: ["plant.period.phase", "plant.period.period_days"],
            requiredFieldId: "plant.period.phase",
        },
    ];
    const plantEventExtensionProfileKeys = [];
    for (const profileDef of plantEventWriteProfiles) {
        const fieldSpecIds = profileDef.fieldIds.map((fieldId) => {
            const id = plantEventExtensionFieldIdByKey.get(fieldId);
            if (!id) {
                throw new Error(`Missing field spec id for ${fieldId}`);
            }
            return id;
        });
        const eventProfile = await prisma.registryProfile.upsert({
            where: { key: profileDef.key },
            create: {
                key: profileDef.key,
                entity: "Plant",
                kind: client_1.RegistryProfileKind.event_write,
                title: profileDef.title,
                description: profileDef.description,
                version: 1,
                isActive: true,
            },
            update: {
                entity: "Plant",
                kind: client_1.RegistryProfileKind.event_write,
                title: profileDef.title,
                description: profileDef.description,
                isActive: true,
            },
            select: { id: true },
        });
        await prisma.registryProfileField.deleteMany({
            where: { profileId: eventProfile.id },
        });
        await prisma.registryProfileField.createMany({
            data: fieldSpecIds.map((fieldSpecId, index) => ({
                profileId: eventProfile.id,
                fieldSpecId,
                position: index,
                required: profileDef.requiredFieldId != null
                    ? profileDef.fieldIds[index] === profileDef.requiredFieldId
                    : index === 0,
            })),
            skipDuplicates: true,
        });
        plantEventExtensionProfileKeys.push(profileDef.key);
    }
    const commonGroup = await prisma.actionPathRegistryGroup.upsert({
        where: { path: "common" },
        create: {
            path: "common",
            description: "Common lifecycle events",
            order: 0,
        },
        update: {
            description: "Common lifecycle events",
        },
        select: { id: true },
    });
    await prisma.actionPathRegistry.upsert({
        where: { actionPath: exports.PLANT_CREATED_ACTION_PATH },
        create: {
            actionPath: exports.PLANT_CREATED_ACTION_PATH,
            description: "Plant created with starter characteristics",
            targetType: "Plant",
            mapping: PLANT_CREATED_ACTION_PATH_MAPPING,
            autoTagRules: [],
            conditions: client_1.Prisma.JsonNull,
            schema: client_1.Prisma.JsonNull,
            groupId: commonGroup.id,
            position: 0,
        },
        update: {
            description: "Plant created with starter characteristics",
            targetType: "Plant",
            mapping: PLANT_CREATED_ACTION_PATH_MAPPING,
            groupId: commonGroup.id,
        },
    });
    const diarySetupGroup = await prisma.actionPathRegistryGroup.upsert({
        where: { path: "diary.setup" },
        create: {
            path: "diary.setup",
            description: "Diary setup events",
            order: 20,
        },
        update: {
            description: "Diary setup events",
        },
        select: { id: true },
    });
    await prisma.actionPathRegistry.upsert({
        where: { actionPath: exports.DIARY_SETUP_CONFIG_ACTION_PATH },
        create: {
            actionPath: exports.DIARY_SETUP_CONFIG_ACTION_PATH,
            description: "Diary setup config (watering type, room type)",
            targetType: "Diary",
            mapping: DIARY_SETUP_CONFIG_ACTION_PATH_MAPPING,
            autoTagRules: [],
            conditions: client_1.Prisma.JsonNull,
            schema: client_1.Prisma.JsonNull,
            groupId: diarySetupGroup.id,
            position: 0,
        },
        update: {
            description: "Diary setup config (watering type, room type)",
            targetType: "Diary",
            mapping: DIARY_SETUP_CONFIG_ACTION_PATH_MAPPING,
            groupId: diarySetupGroup.id,
        },
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
        fields: PLANT_FIELD_SPECS.length +
            PLANT_EVENT_EXTENSION_FIELD_SPECS.length +
            LOCATION_INDOOR_EQUIPMENT_FIELD_SPECS.length +
            DIARY_SETUP_CONFIG_FIELD_SPECS.length +
            PLANT_CREATED_FIELD_SPECS.length,
        profileKey: WATERING_EVENT_PROFILE_KEY,
        profileKeys: [
            WATERING_EVENT_PROFILE_KEY,
            WATERING_CHART_PROFILE_KEY,
            CURRENT_SNAPSHOT_PROFILE_KEY,
            LOCATION_INDOOR_EQUIPMENT_PROFILE_KEY,
            DIARY_SETUP_CONFIG_PROFILE_KEY,
            exports.PLANT_CREATED_PROFILE_KEY,
            ...plantEventExtensionProfileKeys,
        ],
        plantCreatedActionPath: exports.PLANT_CREATED_ACTION_PATH,
    };
}
async function runCli() {
    const prisma = new client_1.PrismaClient();
    try {
        const result = await seedRegistryFieldSpecs(prisma);
        console.log(`Registry field specs seed completed: patterns=${result.patterns}, fields=${result.fields}, profiles=${result.profileKeys.join(",")}`);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    runCli().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
//# sourceMappingURL=seed-registry-field-specs.js.map