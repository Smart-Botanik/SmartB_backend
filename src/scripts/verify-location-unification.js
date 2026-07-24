"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const backfill_location_unification_lib_1 = require("./backfill-location-unification.lib");
async function main() {
    const options = (0, backfill_location_unification_lib_1.parseUnificationCliArgs)(process.argv.slice(2));
    const prisma = new client_1.PrismaClient();
    const issues = [];
    let scanned = 0;
    let ok = 0;
    try {
        const units = await prisma.cultivationUnit.findMany({
            where: options.cultivationUnitId ? { id: options.cultivationUnitId } : undefined,
            orderBy: { createdAt: "asc" },
            include: {
                ...backfill_location_unification_lib_1.cultivationUnitUnificationInclude,
                primaryLocation: {
                    include: {
                        specBlocks: { select: { id: true } },
                        seats: { where: { status: "active" }, select: { id: true, label: true } },
                    },
                },
            },
        });
        if (options.cultivationUnitId && units.length === 0) {
            throw new Error(`CultivationUnit not found: ${options.cultivationUnitId}`);
        }
        console.log(`REW-03 verify: ${units.length} cultivation unit(s)`);
        for (const raw of units) {
            scanned += 1;
            const unit = raw;
            const placementIssue = (0, backfill_location_unification_lib_1.detectMultiPlacementIssues)(unit);
            if (placementIssue) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: placementIssue.code,
                    detail: placementIssue.detail,
                });
                continue;
            }
            const targetLocationId = (0, backfill_location_unification_lib_1.resolveTargetLocationId)(unit);
            if (!targetLocationId) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: "orphan_no_location",
                    detail: "no target location",
                });
                continue;
            }
            const location = unit.primaryLocation?.id === targetLocationId
                ? unit.primaryLocation
                : await prisma.location.findUnique({
                    where: { id: targetLocationId },
                    include: {
                        specBlocks: { select: { id: true } },
                        seats: { where: { status: "active" }, select: { id: true, label: true } },
                    },
                });
            if (!location) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: "missing_location",
                    detail: targetLocationId,
                });
                continue;
            }
            const marker = (0, backfill_location_unification_lib_1.parseRew003Marker)(location.current);
            if (!marker || !(0, backfill_location_unification_lib_1.markerIncludesUnit)(marker, unit.id)) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: "missing_marker",
                    detail: `Location ${location.id} lacks _rew003 for CU ${unit.id}`,
                });
                continue;
            }
            const type = unit.type;
            const subType = unit.subType;
            const capacity = unit.capacity;
            const expectedMode = (0, backfill_location_unification_lib_1.inferSeatLayoutMode)({ type, subType, capacity });
            if (location.seatLayoutMode === "simple_counter" &&
                location.seats.length === 0 &&
                expectedMode === "fixed_grid" &&
                capacity != null &&
                capacity >= 1) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: "missing_seats",
                    detail: `expected fixed_grid with ${capacity} seats on ${location.id}`,
                });
                continue;
            }
            if (location.environmentTagId == null && (type != null || subType != null)) {
                issues.push({
                    cultivationUnitId: unit.id,
                    code: "missing_environment_tag",
                    detail: `Location ${location.id} has legacy type/subType but no environmentTagId`,
                });
                continue;
            }
            ok += 1;
        }
        console.log("\nSummary:", { scanned, ok, issues: issues.length });
        if (issues.length > 0) {
            console.log("\nIssues:");
            for (const issue of issues) {
                console.log(`  [${issue.code}] CU ${issue.cultivationUnitId}: ${issue.detail}`);
            }
            process.exitCode = 1;
        }
        else {
            console.log("All checks passed.");
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
//# sourceMappingURL=verify-location-unification.js.map