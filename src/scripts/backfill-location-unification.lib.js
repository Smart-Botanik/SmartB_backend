"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cultivationUnitUnificationInclude = exports.REW003_BACKFILL_VERSION = exports.REW003_BACKFILL_KEY = void 0;
exports.parseRew003Marker = parseRew003Marker;
exports.markerIncludesUnit = markerIncludesUnit;
exports.mergeRew003Marker = mergeRew003Marker;
exports.detectMultiPlacementIssues = detectMultiPlacementIssues;
exports.resolveTargetLocationId = resolveTargetLocationId;
exports.inferSeatLayoutMode = inferSeatLayoutMode;
exports.mapCuSpecBlocksToInput = mapCuSpecBlocksToInput;
exports.resolveEnvironmentTagIdFromLegacy = resolveEnvironmentTagIdFromLegacy;
exports.buildCuToLocationMapping = buildCuToLocationMapping;
exports.isOrphanCultivationUnit = isOrphanCultivationUnit;
exports.ensureOrphanUnitHasTargetLocation = ensureOrphanUnitHasTargetLocation;
exports.patchUnitWithSyntheticOrphanLocation = patchUnitWithSyntheticOrphanLocation;
exports.parseUnificationCliArgs = parseUnificationCliArgs;
exports.locationNeedsUnification = locationNeedsUnification;
const contracts_1 = require("@growing/contracts");
const spec_blocks_util_1 = require("../modules/cultivation-units/spec-blocks.util");
const seat_util_1 = require("../modules/locations/seat.util");
exports.REW003_BACKFILL_KEY = "_rew003";
exports.REW003_BACKFILL_VERSION = 1;
exports.cultivationUnitUnificationInclude = {
    placements: { orderBy: { sortOrder: "asc" } },
    specBlocks: {
        orderBy: { position: "asc" },
        include: {
            lighting: true,
            enclosure: true,
            space: true,
            area: true,
        },
    },
    primaryLocation: {
        include: {
            specBlocks: { select: { id: true } },
            seats: { where: { status: "active" }, select: { id: true } },
        },
    },
};
function parseRew003Marker(current) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
        return null;
    }
    const raw = current[exports.REW003_BACKFILL_KEY];
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const marker = raw;
    if (marker.version !== exports.REW003_BACKFILL_VERSION ||
        typeof marker.backfilledAt !== "string") {
        return null;
    }
    const ids = marker.cultivationUnitIds?.length
        ? marker.cultivationUnitIds
        : typeof marker.cultivationUnitId === "string"
            ? [marker.cultivationUnitId]
            : null;
    if (!ids?.length) {
        return null;
    }
    return { ...marker, cultivationUnitIds: ids };
}
function markerIncludesUnit(marker, unitId) {
    return marker.cultivationUnitIds.includes(unitId);
}
function mergeRew003Marker(current, cultivationUnitId) {
    const existing = parseRew003Marker(current);
    const cultivationUnitIds = existing
        ? [...new Set([...existing.cultivationUnitIds, cultivationUnitId])]
        : [cultivationUnitId];
    const base = current != null && typeof current === "object" && !Array.isArray(current)
        ? { ...current }
        : {};
    const marker = {
        version: exports.REW003_BACKFILL_VERSION,
        cultivationUnitIds,
        backfilledAt: new Date().toISOString(),
    };
    return {
        ...base,
        [exports.REW003_BACKFILL_KEY]: marker,
    };
}
function detectMultiPlacementIssues(unit) {
    const shared = unit.placements.filter((p) => p.role === "shared");
    if (shared.length > 0) {
        return {
            cultivationUnitId: unit.id,
            cultivationUnitName: unit.name,
            code: "shared_role",
            detail: `${shared.length} placement(s) with role=shared`,
        };
    }
    const primaries = unit.placements.filter((p) => p.role === "primary");
    if (primaries.length > 1) {
        return {
            cultivationUnitId: unit.id,
            cultivationUnitName: unit.name,
            code: "multiple_primary",
            detail: `${primaries.length} primary placements`,
        };
    }
    const targetId = resolveTargetLocationId(unit);
    if (!targetId) {
        return {
            cultivationUnitId: unit.id,
            cultivationUnitName: unit.name,
            code: "orphan_no_location",
            detail: "no primaryLocationId and no primary placement",
        };
    }
    return null;
}
function resolveTargetLocationId(unit) {
    if (unit.primaryLocationId) {
        return unit.primaryLocationId;
    }
    const primaryPlacement = unit.placements.find((p) => p.role === "primary");
    return primaryPlacement?.locationId ?? null;
}
function inferSeatLayoutMode(params) {
    const { type, subType, capacity } = params;
    if (type === "outdoor" || (subType != null && subType.startsWith("outdoor_"))) {
        return "unlimited";
    }
    if (capacity != null && capacity >= 1 && capacity <= 64) {
        const gridSubTypes = [
            "indoor_growbox",
            "indoor_cabinet",
            "greenhouse_classic",
            "greenhouse_tunnel",
        ];
        if (subType != null && gridSubTypes.includes(subType)) {
            return "fixed_grid";
        }
    }
    return "simple_counter";
}
function mapCuSpecBlocksToInput(specBlocks) {
    return specBlocks.map((block) => {
        const base = { position: block.position, kind: block.kind };
        switch (block.kind) {
            case "lighting":
                return {
                    ...base,
                    lighting: {
                        vegetationLamps: block.lighting?.vegetationLamps ?? undefined,
                        bloomLamps: block.lighting?.bloomLamps ?? undefined,
                    },
                };
            case "enclosure":
                return {
                    ...base,
                    enclosure: {
                        productId: block.enclosure?.productId ?? undefined,
                        width: block.enclosure?.width ?? undefined,
                        height: block.enclosure?.height ?? undefined,
                        depth: block.enclosure?.depth ?? undefined,
                    },
                };
            case "space":
                return {
                    ...base,
                    space: {
                        width: block.space?.width ?? undefined,
                        height: block.space?.height ?? undefined,
                        depth: block.space?.depth ?? undefined,
                    },
                };
            case "area":
                return {
                    ...base,
                    area: {
                        width: block.area?.width ?? undefined,
                        depth: block.area?.depth ?? undefined,
                    },
                };
            default:
                throw new Error(`Unknown spec block kind: ${block.kind}`);
        }
    });
}
function resolveEnvironmentTagIdFromLegacy(params) {
    const { subType, tagIdsByVariantKey } = params;
    if (!subType) {
        return { environmentTagId: null, environmentGroupSlug: null };
    }
    const variantKey = contracts_1.LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY[subType];
    if (!variantKey) {
        return { environmentTagId: null, environmentGroupSlug: null };
    }
    const environmentTagId = tagIdsByVariantKey.get(variantKey) ?? null;
    const environmentGroupSlug = (0, contracts_1.environmentGroupSlugFromVariantKey)(variantKey);
    return { environmentTagId, environmentGroupSlug };
}
function buildCuToLocationMapping(params) {
    const { unit, location, tagIdsByVariantKey } = params;
    const type = unit.type;
    const subType = unit.subType;
    const capacity = unit.capacity;
    const occupiedSlots = unit.occupiedSlots ?? 0;
    const envFromLocation = location.environmentTagId
        ? {
            environmentTagId: location.environmentTagId,
            environmentGroupSlug: location.environmentGroupSlug,
        }
        : resolveEnvironmentTagIdFromLegacy({ type, subType, tagIdsByVariantKey });
    const seatLayoutMode = location.seatLayoutMode !== "simple_counter" || location.seats.length > 0
        ? location.seatLayoutMode
        : inferSeatLayoutMode({ type, subType, capacity });
    let seatCreates = [];
    let layoutMeta = location.layoutMeta;
    if (seatLayoutMode === "fixed_grid" &&
        location.seats.length === 0 &&
        capacity != null &&
        capacity >= 1) {
        const seatInputs = (0, seat_util_1.generateFixedGridSeatInputs)(capacity);
        seatCreates = (0, seat_util_1.buildSeatCreateInputs)(seatInputs, "fixed_grid");
        if (layoutMeta == null) {
            layoutMeta = (0, seat_util_1.buildLayoutMetaForCapacity)(capacity);
        }
    }
    const specBlockCreates = location.specBlocks.length === 0 && unit.specBlocks.length > 0
        ? (0, spec_blocks_util_1.buildLocationSpecBlockCreates)(mapCuSpecBlocksToInput(unit.specBlocks))
        : [];
    return {
        targetLocationId: location.id,
        environmentTagId: envFromLocation.environmentTagId,
        environmentGroupSlug: envFromLocation.environmentGroupSlug,
        seatLayoutMode,
        occupiedCount: Math.max(0, occupiedSlots),
        layoutMeta,
        seatCreates,
        specBlockCreates,
    };
}
function isOrphanCultivationUnit(unit) {
    return resolveTargetLocationId(unit) == null;
}
async function ensureOrphanUnitHasTargetLocation(params) {
    const { prisma, unit, tagIdsByVariantKey, dryRun } = params;
    if (!isOrphanCultivationUnit(unit)) {
        return null;
    }
    const placementIssue = detectMultiPlacementIssues(unit);
    if (placementIssue && placementIssue.code !== "orphan_no_location") {
        return null;
    }
    const type = unit.type;
    const subType = unit.subType;
    const capacity = unit.capacity;
    const { environmentTagId, environmentGroupSlug } = resolveEnvironmentTagIdFromLegacy({
        type,
        subType,
        tagIdsByVariantKey,
    });
    const seatLayoutMode = inferSeatLayoutMode({ type, subType, capacity });
    const specBlockCreates = unit.specBlocks.length > 0
        ? (0, spec_blocks_util_1.buildLocationSpecBlockCreates)(mapCuSpecBlocksToInput(unit.specBlocks))
        : [];
    let layoutMeta = null;
    let seatCreates = [];
    if (seatLayoutMode === "fixed_grid" &&
        capacity != null &&
        capacity >= 1) {
        seatCreates = (0, seat_util_1.buildSeatCreateInputs)((0, seat_util_1.generateFixedGridSeatInputs)(capacity), "fixed_grid");
        layoutMeta = (0, seat_util_1.buildLayoutMetaForCapacity)(capacity);
    }
    if (dryRun) {
        return { locationId: `dry-run-location-for-${unit.id}`, created: true };
    }
    const location = await prisma.$transaction(async (tx) => {
        const created = await tx.location.create({
            data: {
                userId: unit.userId,
                name: unit.name,
                environmentTagId,
                environmentGroupSlug,
                seatLayoutMode,
                layoutMeta: layoutMeta ?? undefined,
                occupiedCount: Math.max(0, unit.occupiedSlots ?? 0),
                ...(specBlockCreates.length > 0 && {
                    specBlocks: { create: specBlockCreates },
                }),
                ...(seatCreates.length > 0 && {
                    seats: { create: seatCreates },
                }),
            },
        });
        await tx.cultivationUnit.update({
            where: { id: unit.id },
            data: { primaryLocationId: created.id },
        });
        await tx.cultivationUnitPlacement.create({
            data: {
                cultivationUnitId: unit.id,
                locationId: created.id,
                role: "primary",
                sortOrder: 0,
            },
        });
        return created;
    });
    return { locationId: location.id, created: true };
}
function patchUnitWithSyntheticOrphanLocation(unit, locationId) {
    const syntheticLocation = {
        id: locationId,
        userId: unit.userId,
        name: unit.name,
        environmentTagId: null,
        environmentGroupSlug: null,
        seatLayoutMode: inferSeatLayoutMode({
            type: unit.type,
            subType: unit.subType,
            capacity: unit.capacity,
        }),
        layoutMeta: null,
        current: null,
        specBlocks: [],
        seats: [],
    };
    return {
        ...unit,
        primaryLocationId: locationId,
        primaryLocation: syntheticLocation,
        placements: [
            ...unit.placements,
            {
                id: `dry-run-placement-${unit.id}`,
                cultivationUnitId: unit.id,
                locationId,
                role: "primary",
                sortOrder: 0,
                createdAt: unit.createdAt,
            },
        ],
    };
}
function parseUnificationCliArgs(argv) {
    let dryRun = false;
    let skipTaxonomy = false;
    let skipOrphanProvision = false;
    let cultivationUnitId;
    for (const arg of argv) {
        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }
        if (arg === "--skip-taxonomy") {
            skipTaxonomy = true;
            continue;
        }
        if (arg === "--skip-orphan-provision") {
            skipOrphanProvision = true;
            continue;
        }
        if (arg.startsWith("--cultivation-unit-id=")) {
            cultivationUnitId = arg.slice("--cultivation-unit-id=".length).trim() || undefined;
        }
    }
    return { dryRun, cultivationUnitId, skipTaxonomy, skipOrphanProvision };
}
function locationNeedsUnification(location, unitId) {
    const marker = parseRew003Marker(location.current);
    if (marker && markerIncludesUnit(marker, unitId)) {
        return false;
    }
    return (location.environmentTagId == null ||
        (location.seatLayoutMode === "simple_counter" &&
            location.seats.length === 0 &&
            location.specBlocks.length === 0));
}
//# sourceMappingURL=backfill-location-unification.lib.js.map