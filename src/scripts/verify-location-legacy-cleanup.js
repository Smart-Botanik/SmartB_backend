"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const backfill_location_unification_lib_1 = require("./backfill-location-unification.lib");
async function main() {
    const prisma = new client_1.PrismaClient();
    const issues = [];
    try {
        const units = await prisma.cultivationUnit.findMany({
            orderBy: { createdAt: "asc" },
            include: backfill_location_unification_lib_1.cultivationUnitUnificationInclude,
        });
        for (const raw of units) {
            const unit = raw;
            const placementIssue = (0, backfill_location_unification_lib_1.detectMultiPlacementIssues)(unit);
            if (placementIssue) {
                issues.push({
                    code: placementIssue.code,
                    entity: `CultivationUnit:${unit.id}`,
                    detail: placementIssue.detail,
                });
                continue;
            }
            const targetLocationId = (0, backfill_location_unification_lib_1.resolveTargetLocationId)(unit);
            if (!targetLocationId) {
                issues.push({
                    code: "orphan_no_location",
                    entity: `CultivationUnit:${unit.id}`,
                    detail: unit.name,
                });
                continue;
            }
            const location = await prisma.location.findUnique({
                where: { id: targetLocationId },
                select: {
                    id: true,
                    name: true,
                    environmentTagId: true,
                    current: true,
                },
            });
            if (!location) {
                issues.push({
                    code: "missing_location",
                    entity: `CultivationUnit:${unit.id}`,
                    detail: targetLocationId,
                });
                continue;
            }
            const marker = (0, backfill_location_unification_lib_1.parseRew003Marker)(location.current);
            if (!marker || !(0, backfill_location_unification_lib_1.markerIncludesUnit)(marker, unit.id)) {
                issues.push({
                    code: "missing_rew003_marker",
                    entity: `Location:${location.id}`,
                    detail: `CU ${unit.id} not in _rew003`,
                });
            }
            if (location.environmentTagId == null) {
                issues.push({
                    code: "missing_environment_tag",
                    entity: `Location:${location.id}`,
                    detail: `${location.name} has no environmentTagId`,
                });
            }
        }
        const locationsMissingTag = await prisma.location.count({
            where: { environmentTagId: null },
        });
        if (locationsMissingTag > 0) {
            issues.push({
                code: "location_missing_environment_tag",
                entity: "Location",
                detail: `${locationsMissingTag} row(s) without environmentTagId`,
            });
        }
        const plantsPendingPlacement = await prisma.plant.count({
            where: {
                placementStage: "none",
                OR: [{ cultivationUnitId: { not: null } }, { locationId: { not: null } }],
            },
        });
        if (plantsPendingPlacement > 0) {
            issues.push({
                code: "plant_placement_pending",
                entity: "Plant",
                detail: `${plantsPendingPlacement} row(s) need placement backfill`,
            });
        }
        console.log("BK-REW-01-3 post-cutover gate");
        console.log(`Cultivation units scanned: ${units.length}`);
        console.log(`Issues: ${issues.length}`);
        if (issues.length > 0) {
            console.log("\nBlockers:");
            for (const issue of issues) {
                console.log(`  [${issue.code}] ${issue.entity}: ${issue.detail}`);
            }
            process.exitCode = 1;
        }
        else {
            console.log("Location legacy cutover checks passed.");
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
//# sourceMappingURL=verify-location-legacy-cleanup.js.map