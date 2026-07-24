"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const backfill_location_cultivation_unit_lib_1 = require("./backfill-location-cultivation-unit.lib");
async function main() {
    const prisma = new client_1.PrismaClient();
    const issues = [];
    try {
        const locations = await prisma.location.findMany({
            include: backfill_location_cultivation_unit_lib_1.locationBackfillInclude,
            orderBy: { createdAt: "asc" },
        });
        let eligible = 0;
        let backfilled = 0;
        let pending = 0;
        for (const row of locations) {
            const location = row;
            if (!(0, backfill_location_cultivation_unit_lib_1.locationEligibleForBackfill)(location)) {
                continue;
            }
            eligible += 1;
            const marker = (0, backfill_location_cultivation_unit_lib_1.parseBackfillMarker)(location.current);
            if (!marker) {
                pending += 1;
                issues.push({
                    locationId: location.id,
                    code: "missing_marker",
                    message: `Eligible location "${location.name}" has no _adr0011 marker`,
                });
                continue;
            }
            backfilled += 1;
            const unit = await prisma.cultivationUnit.findUnique({
                where: { id: marker.cultivationUnitId },
                include: {
                    specBlocks: {
                        orderBy: { position: "asc" },
                        include: { lighting: true, enclosure: true, space: true, area: true },
                    },
                    placements: true,
                },
            });
            if (!unit) {
                issues.push({
                    locationId: location.id,
                    code: "missing_unit",
                    message: `Marker points to missing CultivationUnit ${marker.cultivationUnitId}`,
                });
                continue;
            }
            if (unit.primaryLocationId !== location.id) {
                issues.push({
                    locationId: location.id,
                    code: "primary_mismatch",
                    message: `Unit ${unit.id} primaryLocationId=${unit.primaryLocationId}`,
                });
            }
            const primaryPlacement = unit.placements.find((p) => p.role === "primary");
            if (!primaryPlacement || primaryPlacement.locationId !== location.id) {
                issues.push({
                    locationId: location.id,
                    code: "missing_primary_placement",
                    message: `Unit ${unit.id} has no primary placement at location`,
                });
            }
            if ((0, backfill_location_cultivation_unit_lib_1.locationHasLegacyGrowingProfile)(location)) {
                if (!(0, backfill_location_cultivation_unit_lib_1.legacyFieldsMatch)({ location, unit })) {
                    issues.push({
                        locationId: location.id,
                        code: "field_mismatch",
                        message: `Legacy location fields do not match unit ${unit.id}`,
                    });
                }
                if (location.specBlocks.length !== unit.specBlocks.length) {
                    issues.push({
                        locationId: location.id,
                        code: "spec_count_mismatch",
                        message: `Location specs=${location.specBlocks.length}, unit specs=${unit.specBlocks.length}`,
                    });
                }
                else {
                    const expected = (0, backfill_location_cultivation_unit_lib_1.mapLocationSpecBlocksToInput)(location.specBlocks);
                    for (let i = 0; i < expected.length; i += 1) {
                        const exp = expected[i];
                        const act = unit.specBlocks[i];
                        if (exp.position !== act.position || exp.kind !== act.kind) {
                            issues.push({
                                locationId: location.id,
                                code: "spec_block_mismatch",
                                message: `Spec block index ${i} mismatch at position/kind`,
                            });
                            break;
                        }
                    }
                }
            }
            const unlinkedPlants = await prisma.plant.count({
                where: {
                    locationId: location.id,
                    cultivationUnitId: null,
                },
            });
            if (unlinkedPlants > 0) {
                issues.push({
                    locationId: location.id,
                    code: "plants_unlinked",
                    message: `${unlinkedPlants} plant(s) still have locationId without cultivationUnitId`,
                });
            }
            const wrongUnitPlants = await prisma.plant.count({
                where: {
                    locationId: location.id,
                    cultivationUnitId: { not: unit.id },
                },
            });
            if (wrongUnitPlants > 0) {
                issues.push({
                    locationId: location.id,
                    code: "plants_wrong_unit",
                    message: `${wrongUnitPlants} plant(s) linked to a different cultivationUnitId`,
                });
            }
        }
        console.log("ADR-0011 verify summary:", {
            locationsTotal: locations.length,
            eligible,
            backfilled,
            pending,
            issues: issues.length,
        });
        if (issues.length > 0) {
            console.log("\nIssues:");
            for (const issue of issues) {
                console.log(`- [${issue.code}] ${issue.locationId}: ${issue.message}`);
            }
            process.exit(1);
        }
        console.log("OK — backfill consistency verified.");
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=verify-location-cultivation-unit-backfill.js.map