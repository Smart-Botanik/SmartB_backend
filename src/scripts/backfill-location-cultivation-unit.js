"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const spec_blocks_util_1 = require("../modules/cultivation-units/spec-blocks.util");
const backfill_location_cultivation_unit_lib_1 = require("./backfill-location-cultivation-unit.lib");
async function linkPlants(prisma, locationId, cultivationUnitId) {
    const result = await prisma.plant.updateMany({
        where: {
            locationId,
            cultivationUnitId: null,
        },
        data: { cultivationUnitId },
    });
    return result.count;
}
async function linkDiaries(prisma, diaryIds, cultivationUnitId) {
    if (diaryIds.length === 0)
        return 0;
    let linked = 0;
    for (const diaryId of diaryIds) {
        const diary = await prisma.diary.findUnique({
            where: { id: diaryId },
            include: { cultivationUnits: { where: { id: cultivationUnitId }, select: { id: true } } },
        });
        if (!diary)
            continue;
        if (diary.cultivationUnits.length > 0)
            continue;
        await prisma.diary.update({
            where: { id: diaryId },
            data: { cultivationUnits: { connect: { id: cultivationUnitId } } },
        });
        linked += 1;
    }
    return linked;
}
async function clearLocationLegacy(prisma, locationId) {
    await prisma.locationSpecBlock.deleteMany({ where: { locationId } });
}
async function backfillLocation(params) {
    const { prisma, location, dryRun, clearLegacy, stats } = params;
    if (!(0, backfill_location_cultivation_unit_lib_1.locationEligibleForBackfill)(location)) {
        stats.skippedIneligible += 1;
        console.log(`[skip:ineligible] ${location.id} "${location.name}"`);
        return;
    }
    const marker = (0, backfill_location_cultivation_unit_lib_1.parseBackfillMarker)(location.current);
    if (marker) {
        const existing = await prisma.cultivationUnit.findUnique({
            where: { id: marker.cultivationUnitId },
            select: { id: true, primaryLocationId: true },
        });
        if (existing?.primaryLocationId === location.id) {
            stats.skippedExisting += 1;
            const plantsLinked = dryRun
                ? await prisma.plant.count({
                    where: { locationId: location.id, cultivationUnitId: null },
                })
                : await linkPlants(prisma, location.id, existing.id);
            if (plantsLinked > 0) {
                stats.repairedLinks += plantsLinked;
                console.log(`[repair] ${location.id} linked ${plantsLinked} plant(s) → ${existing.id}`);
            }
            const diariesLinked = dryRun
                ? 0
                : await linkDiaries(prisma, location.diaries.map((d) => d.id), existing.id);
            stats.linkedDiaries += diariesLinked;
            if (clearLegacy && locationHasLegacyData(location)) {
                if (dryRun) {
                    stats.clearedLegacy += 1;
                    console.log(`[dry-run:clear-legacy] ${location.id}`);
                }
                else {
                    await clearLocationLegacy(prisma, location.id);
                    stats.clearedLegacy += 1;
                    console.log(`[clear-legacy] ${location.id}`);
                }
            }
            console.log(`[skip:existing] ${location.id} → ${existing.id}`);
            return;
        }
        console.warn(`[warn] ${location.id} marker ${marker.cultivationUnitId} missing or mismatched; recreating`);
    }
    const unitName = (0, backfill_location_cultivation_unit_lib_1.defaultCultivationUnitName)(location.name);
    const specBlockInputs = (0, backfill_location_cultivation_unit_lib_1.mapLocationSpecBlocksToInput)(location.specBlocks);
    const specCreates = specBlockInputs.length > 0
        ? (0, spec_blocks_util_1.buildCultivationUnitSpecBlockCreates)(specBlockInputs)
        : [];
    if (dryRun) {
        stats.created += 1;
        const pendingPlants = await prisma.plant.count({
            where: { locationId: location.id, cultivationUnitId: null },
        });
        stats.linkedPlants += pendingPlants;
        stats.linkedDiaries += location.diaries.length;
        if (clearLegacy && locationHasLegacyData(location)) {
            stats.clearedLegacy += 1;
        }
        console.log(`[dry-run] ${location.id} "${location.name}" → CU "${unitName}" ` +
            `(specs=${specCreates.length}, plants=${pendingPlants}, diaries=${location.diaries.length})`);
        return;
    }
    const unit = await prisma.$transaction(async (tx) => {
        const created = await tx.cultivationUnit.create({
            data: {
                userId: location.userId,
                primaryLocationId: location.id,
                name: unitName,
                status: (0, backfill_location_cultivation_unit_lib_1.mapLocationStatusToUnitStatus)(location.status),
                occupiedSlots: location.occupiedCount > 0 ? location.occupiedCount : null,
                placements: {
                    create: {
                        locationId: location.id,
                        role: client_1.CultivationUnitPlacementRole.primary,
                        sortOrder: 0,
                    },
                },
                ...(specCreates.length > 0 && {
                    specBlocks: { create: specCreates },
                }),
                ...(location.diaries.length > 0 && {
                    diaries: {
                        connect: location.diaries.map((d) => ({ id: d.id })),
                    },
                }),
            },
        });
        await tx.location.update({
            where: { id: location.id },
            data: { current: (0, backfill_location_cultivation_unit_lib_1.mergeBackfillMarker)(location.current, created.id) },
        });
        return created;
    });
    stats.created += 1;
    const plantsLinked = await linkPlants(prisma, location.id, unit.id);
    stats.linkedPlants += plantsLinked;
    if (clearLegacy && locationHasLegacyData(location)) {
        await clearLocationLegacy(prisma, location.id);
        stats.clearedLegacy += 1;
    }
    console.log(`[ok] ${location.id} "${location.name}" → ${unit.id} ` +
        `(specs=${specCreates.length}, plants=${plantsLinked})`);
}
function locationHasLegacyData(location) {
    return location.specBlocks.length > 0;
}
async function main() {
    const options = (0, backfill_location_cultivation_unit_lib_1.parseBackfillCliArgs)(process.argv.slice(2));
    const prisma = new client_1.PrismaClient();
    const stats = {
        scanned: 0,
        skippedIneligible: 0,
        skippedExisting: 0,
        created: 0,
        linkedPlants: 0,
        linkedDiaries: 0,
        clearedLegacy: 0,
        repairedLinks: 0,
    };
    try {
        const locations = await prisma.location.findMany({
            where: options.locationId ? { id: options.locationId } : undefined,
            orderBy: { createdAt: "asc" },
            include: backfill_location_cultivation_unit_lib_1.locationBackfillInclude,
        });
        if (options.locationId && locations.length === 0) {
            throw new Error(`Location not found: ${options.locationId}`);
        }
        console.log(`ADR-0011 backfill: ${locations.length} location(s)` +
            `${options.dryRun ? " [dry-run]" : ""}` +
            `${options.clearLegacy ? " [clear-legacy]" : ""}`);
        for (const location of locations) {
            stats.scanned += 1;
            await backfillLocation({
                prisma,
                location: location,
                dryRun: options.dryRun,
                clearLegacy: options.clearLegacy,
                stats,
            });
        }
        console.log("\nSummary:", stats);
        if (options.dryRun) {
            console.log("Dry run — no writes performed.");
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=backfill-location-cultivation-unit.js.map