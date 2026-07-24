"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@growing/contracts");
const client_1 = require("@prisma/client");
const backfill_location_unification_lib_1 = require("./backfill-location-unification.lib");
const taxonomy_prisma_for_migration_1 = require("./taxonomy-prisma-for-migration");
async function loadEnvironmentTagIds(skipTaxonomy) {
    if (skipTaxonomy) {
        return new Map();
    }
    const url = process.env.TAXONOMY_DATABASE_URL?.trim();
    if (!url) {
        console.warn("[warn] TAXONOMY_DATABASE_URL unset — environmentTagId backfill skipped; use --skip-taxonomy to silence");
        return new Map();
    }
    const variantKeys = [
        ...new Set(Object.values(contracts_1.LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY)),
    ].filter(Boolean);
    const taxonomy = (0, taxonomy_prisma_for_migration_1.createTaxonomyPrisma)(url);
    try {
        const tags = await taxonomy.taxonomyTag.findMany({
            where: { key: { in: variantKeys } },
            select: { id: true, key: true },
        });
        return new Map(tags.map((t) => [t.key, t.id]));
    }
    finally {
        await taxonomy.$disconnect();
    }
}
async function backfillUnit(params) {
    const { prisma, tagIdsByVariantKey, dryRun, skipOrphanProvision, stats, issues } = params;
    let unit = params.unit;
    const placementIssue = (0, backfill_location_unification_lib_1.detectMultiPlacementIssues)(unit);
    if (placementIssue && placementIssue.code !== "orphan_no_location") {
        stats.multiPlacementErrors += 1;
        issues.push(placementIssue);
        console.error(`[error:${placementIssue.code}] CU ${unit.id} "${unit.name}" — ${placementIssue.detail}`);
        return;
    }
    if (placementIssue?.code === "orphan_no_location" &&
        !skipOrphanProvision) {
        const provision = await (0, backfill_location_unification_lib_1.ensureOrphanUnitHasTargetLocation)({
            prisma,
            unit,
            tagIdsByVariantKey,
            dryRun,
        });
        if (provision?.created) {
            stats.orphanLocationsCreated += 1;
            console.log(`[orphan:provision] CU ${unit.id} "${unit.name}" → Location ${provision.locationId}`);
            if (!dryRun) {
                const reloaded = await prisma.cultivationUnit.findUniqueOrThrow({
                    where: { id: unit.id },
                    include: backfill_location_unification_lib_1.cultivationUnitUnificationInclude,
                });
                unit = reloaded;
            }
            else {
                unit = (0, backfill_location_unification_lib_1.patchUnitWithSyntheticOrphanLocation)(unit, provision.locationId);
            }
        }
    }
    const refreshedPlacementIssue = (0, backfill_location_unification_lib_1.detectMultiPlacementIssues)(unit);
    if (refreshedPlacementIssue) {
        if (refreshedPlacementIssue.code === "orphan_no_location") {
            stats.skippedNoLocation += 1;
            console.log(`[skip:no-location] CU ${unit.id} "${unit.name}"`);
            return;
        }
        stats.multiPlacementErrors += 1;
        issues.push(refreshedPlacementIssue);
        console.error(`[error:${refreshedPlacementIssue.code}] CU ${unit.id} "${unit.name}" — ${refreshedPlacementIssue.detail}`);
        return;
    }
    const targetLocationId = (0, backfill_location_unification_lib_1.resolveTargetLocationId)(unit);
    if (!targetLocationId) {
        stats.skippedNoLocation += 1;
        console.log(`[skip:no-location] CU ${unit.id} "${unit.name}"`);
        return;
    }
    let location = unit.primaryLocation;
    if (!location || location.id !== targetLocationId) {
        location = await prisma.location.findUnique({
            where: { id: targetLocationId },
            include: {
                specBlocks: { select: { id: true } },
                seats: { where: { status: "active" }, select: { id: true } },
            },
        });
    }
    if (!location) {
        stats.skippedNoLocation += 1;
        console.log(`[skip:missing-location] CU ${unit.id} → ${targetLocationId}`);
        return;
    }
    const marker = (0, backfill_location_unification_lib_1.parseRew003Marker)(location.current);
    if (marker && (0, backfill_location_unification_lib_1.markerIncludesUnit)(marker, unit.id)) {
        stats.skippedExisting += 1;
        console.log(`[skip:existing] CU ${unit.id} → Location ${location.id}`);
        return;
    }
    const mapping = (0, backfill_location_unification_lib_1.buildCuToLocationMapping)({
        unit,
        location: location,
        tagIdsByVariantKey,
    });
    if (dryRun) {
        stats.updated += 1;
        stats.seatsCreated += mapping.seatCreates.length;
        stats.specBlocksCopied += mapping.specBlockCreates.length;
        console.log(`[dry-run] CU ${unit.id} "${unit.name}" → Location ${location.id} ` +
            `(mode=${mapping.seatLayoutMode}, seats=${mapping.seatCreates.length}, ` +
            `specs=${mapping.specBlockCreates.length}, envTag=${mapping.environmentTagId ?? "—"})`);
        return;
    }
    await prisma.$transaction(async (tx) => {
        const fresh = await tx.location.findUniqueOrThrow({
            where: { id: location.id },
            include: {
                specBlocks: { select: { id: true, position: true } },
                seats: { where: { status: "active" }, select: { id: true } },
            },
        });
        const specBlockCreates = fresh.specBlocks.length === 0 ? mapping.specBlockCreates : [];
        const seatCreates = fresh.seats.length === 0 && mapping.seatCreates.length > 0
            ? mapping.seatCreates
            : [];
        await tx.location.update({
            where: { id: fresh.id },
            data: {
                ...(fresh.environmentTagId == null &&
                    mapping.environmentTagId != null && {
                    environmentTagId: mapping.environmentTagId,
                    environmentGroupSlug: mapping.environmentGroupSlug,
                }),
                seatLayoutMode: fresh.seats.length > 0 ? fresh.seatLayoutMode : mapping.seatLayoutMode,
                ...(mapping.layoutMeta != null &&
                    fresh.layoutMeta == null && { layoutMeta: mapping.layoutMeta }),
                occupiedCount: mapping.occupiedCount,
                current: (0, backfill_location_unification_lib_1.mergeRew003Marker)(fresh.current, unit.id),
                ...(specBlockCreates.length > 0 && {
                    specBlocks: { create: specBlockCreates },
                }),
                ...(seatCreates.length > 0 && {
                    seats: { create: seatCreates },
                }),
            },
        });
        stats.seatsCreated += seatCreates.length;
        stats.specBlocksCopied += specBlockCreates.length;
    });
    stats.updated += 1;
    console.log(`[ok] CU ${unit.id} "${unit.name}" → Location ${location.id}`);
}
async function main() {
    const options = (0, backfill_location_unification_lib_1.parseUnificationCliArgs)(process.argv.slice(2));
    const prisma = new client_1.PrismaClient();
    const stats = {
        scanned: 0,
        skippedExisting: 0,
        skippedNoLocation: 0,
        orphanLocationsCreated: 0,
        updated: 0,
        seatsCreated: 0,
        specBlocksCopied: 0,
        multiPlacementErrors: 0,
    };
    const issues = [];
    try {
        const tagIdsByVariantKey = await loadEnvironmentTagIds(options.skipTaxonomy);
        const units = await prisma.cultivationUnit.findMany({
            where: options.cultivationUnitId ? { id: options.cultivationUnitId } : undefined,
            orderBy: { createdAt: "asc" },
            include: backfill_location_unification_lib_1.cultivationUnitUnificationInclude,
        });
        if (options.cultivationUnitId && units.length === 0) {
            throw new Error(`CultivationUnit not found: ${options.cultivationUnitId}`);
        }
        console.log(`REW-03 location unification: ${units.length} cultivation unit(s)` +
            `${options.dryRun ? " [dry-run]" : ""}`);
        for (const unit of units) {
            stats.scanned += 1;
            await backfillUnit({
                prisma,
                unit: unit,
                tagIdsByVariantKey,
                dryRun: options.dryRun,
                skipOrphanProvision: options.skipOrphanProvision,
                stats,
                issues,
            });
        }
        console.log("\nSummary:", stats);
        if (issues.length > 0) {
            console.log("\nMulti-placement issues:", issues);
            process.exitCode = 2;
        }
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
//# sourceMappingURL=backfill-location-unification.js.map