"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationBackfillInclude = exports.BACKFILL_VERSION = exports.BACKFILL_UNIT_NAME_SUFFIX = exports.ADR0011_BACKFILL_KEY = void 0;
exports.parseBackfillMarker = parseBackfillMarker;
exports.mergeBackfillMarker = mergeBackfillMarker;
exports.defaultCultivationUnitName = defaultCultivationUnitName;
exports.mapLocationStatusToUnitStatus = mapLocationStatusToUnitStatus;
exports.locationHasLegacyGrowingProfile = locationHasLegacyGrowingProfile;
exports.locationEligibleForBackfill = locationEligibleForBackfill;
exports.mapLocationSpecBlocksToInput = mapLocationSpecBlocksToInput;
exports.parseBackfillCliArgs = parseBackfillCliArgs;
exports.legacyFieldsMatch = legacyFieldsMatch;
exports.ADR0011_BACKFILL_KEY = "_adr0011";
exports.BACKFILL_UNIT_NAME_SUFFIX = " — основное";
exports.BACKFILL_VERSION = 1;
exports.locationBackfillInclude = {
    specBlocks: {
        orderBy: { position: "asc" },
        include: {
            lighting: true,
            enclosure: true,
            space: true,
            area: true,
        },
    },
    diaries: { select: { id: true } },
    _count: { select: { plants: true } },
};
function parseBackfillMarker(current) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
        return null;
    }
    const raw = current[exports.ADR0011_BACKFILL_KEY];
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const marker = raw;
    if (marker.version !== exports.BACKFILL_VERSION ||
        typeof marker.cultivationUnitId !== "string" ||
        typeof marker.backfilledAt !== "string") {
        return null;
    }
    return marker;
}
function mergeBackfillMarker(current, cultivationUnitId) {
    const base = current != null && typeof current === "object" && !Array.isArray(current)
        ? { ...current }
        : {};
    const marker = {
        version: exports.BACKFILL_VERSION,
        cultivationUnitId,
        backfilledAt: new Date().toISOString(),
    };
    return {
        ...base,
        [exports.ADR0011_BACKFILL_KEY]: marker,
    };
}
function defaultCultivationUnitName(locationName) {
    const trimmed = locationName.trim();
    if (trimmed.endsWith(exports.BACKFILL_UNIT_NAME_SUFFIX.trim())) {
        return trimmed;
    }
    return `${trimmed}${exports.BACKFILL_UNIT_NAME_SUFFIX}`;
}
function mapLocationStatusToUnitStatus(status) {
    return status === "archived" ? "archived" : "active";
}
function locationHasLegacyGrowingProfile(location) {
    return location.environmentTagId != null || location.specBlocks.length > 0;
}
function locationEligibleForBackfill(location) {
    return locationHasLegacyGrowingProfile(location) || location._count.plants > 0;
}
function mapLocationSpecBlocksToInput(specBlocks) {
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
function parseBackfillCliArgs(argv) {
    let dryRun = false;
    let clearLegacy = false;
    let locationId;
    for (const arg of argv) {
        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }
        if (arg === "--clear-legacy") {
            clearLegacy = true;
            continue;
        }
        if (arg.startsWith("--location-id=")) {
            locationId = arg.slice("--location-id=".length).trim() || undefined;
        }
    }
    return { dryRun, clearLegacy, locationId };
}
function legacyFieldsMatch(params) {
    const { location, unit } = params;
    return (mapLocationStatusToUnitStatus(location.status) === unit.status &&
        Math.max(0, location.occupiedCount) === Math.max(0, unit.occupiedSlots ?? 0));
}
//# sourceMappingURL=backfill-location-cultivation-unit.lib.js.map