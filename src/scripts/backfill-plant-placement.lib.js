"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlantTargetLocationId = resolvePlantTargetLocationId;
exports.buildPlantPlacementMapping = buildPlantPlacementMapping;
exports.plantNeedsPlacementBackfill = plantNeedsPlacementBackfill;
exports.backfillPlantPlacements = backfillPlantPlacements;
exports.parsePlantPlacementCliArgs = parsePlantPlacementCliArgs;
function resolvePlantTargetLocationId(plant) {
    return plant.locationId ?? plant.cultivationUnit?.primaryLocationId ?? null;
}
function buildPlantPlacementMapping(params) {
    const { location, freeSeats } = params;
    if (location.seatLayoutMode === "simple_counter") {
        return {
            placementStage: "seated",
            plannedLocationId: null,
            currentSeatId: null,
            locationId: location.id,
            seatIdToAssign: null,
        };
    }
    if (freeSeats.length > 0) {
        const seat = freeSeats[0];
        return {
            placementStage: "seated",
            plannedLocationId: null,
            currentSeatId: seat.id,
            locationId: location.id,
            seatIdToAssign: seat.id,
        };
    }
    return {
        placementStage: "ready_to_plant",
        plannedLocationId: location.id,
        currentSeatId: null,
        locationId: location.id,
        seatIdToAssign: null,
    };
}
function plantNeedsPlacementBackfill(plant) {
    if (plant.placementStage !== "none") {
        return false;
    }
    return plant.cultivationUnitId != null || plant.locationId != null;
}
async function backfillPlantPlacements(params) {
    const stats = {
        scanned: 0,
        updated: 0,
        seated: 0,
        queued: 0,
        skipped: 0,
    };
    const plants = await params.prisma.plant.findMany({
        where: {
            ...(params.plantId ? { id: params.plantId } : {}),
            placementStage: "none",
            OR: [{ cultivationUnitId: { not: null } }, { locationId: { not: null } }],
        },
        include: {
            cultivationUnit: { select: { primaryLocationId: true } },
        },
        orderBy: { createdAt: "asc" },
    });
    for (const plant of plants) {
        stats.scanned += 1;
        if (!plantNeedsPlacementBackfill(plant)) {
            stats.skipped += 1;
            continue;
        }
        const targetLocationId = resolvePlantTargetLocationId(plant);
        if (!targetLocationId) {
            stats.skipped += 1;
            console.log(`[skip:no-location] plant ${plant.id}`);
            continue;
        }
        const location = await params.prisma.location.findUnique({
            where: { id: targetLocationId },
            select: { id: true, seatLayoutMode: true },
        });
        if (!location) {
            stats.skipped += 1;
            console.log(`[skip:missing-location] plant ${plant.id} → ${targetLocationId}`);
            continue;
        }
        const freeSeats = await params.prisma.seat.findMany({
            where: {
                locationId: location.id,
                status: "active",
                plantId: null,
            },
            orderBy: { label: "asc" },
            select: { id: true, label: true },
        });
        const mapping = buildPlantPlacementMapping({ location, freeSeats });
        if (params.dryRun) {
            stats.updated += 1;
            if (mapping.placementStage === "seated")
                stats.seated += 1;
            if (mapping.placementStage === "ready_to_plant")
                stats.queued += 1;
            console.log(`[dry-run] plant ${plant.id} → ${mapping.placementStage} @ ${location.id}` +
                (mapping.seatIdToAssign ? ` seat ${mapping.seatIdToAssign}` : ""));
            continue;
        }
        await params.prisma.$transaction(async (tx) => {
            if (mapping.seatIdToAssign) {
                const seat = await tx.seat.findUnique({
                    where: { id: mapping.seatIdToAssign },
                    select: { plantId: true },
                });
                if (seat?.plantId) {
                    throw new Error(`seat ${mapping.seatIdToAssign} became occupied during backfill`);
                }
                await tx.seat.update({
                    where: { id: mapping.seatIdToAssign },
                    data: { plantId: plant.id },
                });
            }
            await tx.plant.update({
                where: { id: plant.id },
                data: {
                    placementStage: mapping.placementStage,
                    plannedLocationId: mapping.plannedLocationId,
                    currentSeatId: mapping.currentSeatId,
                    locationId: mapping.locationId,
                },
            });
        });
        stats.updated += 1;
        if (mapping.placementStage === "seated")
            stats.seated += 1;
        if (mapping.placementStage === "ready_to_plant")
            stats.queued += 1;
        console.log(`[ok] plant ${plant.id} → ${mapping.placementStage} @ ${location.id}` +
            (mapping.seatIdToAssign ? ` seat ${mapping.seatIdToAssign}` : ""));
    }
    return stats;
}
function parsePlantPlacementCliArgs(argv) {
    let dryRun = false;
    let plantId;
    for (const arg of argv) {
        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }
        if (arg.startsWith("--plant-id=")) {
            plantId = arg.slice("--plant-id=".length).trim() || undefined;
        }
    }
    return { dryRun, plantId };
}
//# sourceMappingURL=backfill-plant-placement.lib.js.map