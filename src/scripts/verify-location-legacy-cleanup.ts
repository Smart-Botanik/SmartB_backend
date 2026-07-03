/**
 * BK-REW-01-3 gate: verify legacy Location/CU fields are ready to DROP.
 *
 * Run after REW-03 backfill + verify pass on target environment.
 *
 * Usage:
 *   npx ts-node src/scripts/verify-location-legacy-cleanup.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  cultivationUnitUnificationInclude,
  detectMultiPlacementIssues,
  markerIncludesUnit,
  parseRew003Marker,
  resolveTargetLocationId,
  type CultivationUnitWithRelations,
} from "./backfill-location-unification.lib";

type CleanupIssue = {
  code: string;
  entity: string;
  detail: string;
};

async function main() {
  const prisma = new PrismaClient();
  const issues: CleanupIssue[] = [];

  try {
    const units = await prisma.cultivationUnit.findMany({
      orderBy: { createdAt: "asc" },
      include: cultivationUnitUnificationInclude,
    });

    for (const raw of units) {
      const unit = raw as CultivationUnitWithRelations;
      const placementIssue = detectMultiPlacementIssues(unit);
      if (placementIssue) {
        issues.push({
          code: placementIssue.code,
          entity: `CultivationUnit:${unit.id}`,
          detail: placementIssue.detail,
        });
        continue;
      }

      const targetLocationId = resolveTargetLocationId(unit);
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
          type: true,
          subType: true,
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

      const marker = parseRew003Marker(location.current);
      if (!marker || !markerIncludesUnit(marker, unit.id)) {
        issues.push({
          code: "missing_rew003_marker",
          entity: `Location:${location.id}`,
          detail: `CU ${unit.id} not in _rew003`,
        });
      }

      if (
        location.environmentTagId == null &&
        (location.type != null || location.subType != null)
      ) {
        issues.push({
          code: "missing_environment_tag",
          entity: `Location:${location.id}`,
          detail: `${location.name} has legacy type/subType without environmentTagId`,
        });
      }
    }

    const locationsWithLegacyTree = await prisma.location.count({
      where: { parentLocationId: { not: null } },
    });
    if (locationsWithLegacyTree > 0) {
      issues.push({
        code: "parent_location_in_use",
        entity: "Location",
        detail: `${locationsWithLegacyTree} row(s) still use parentLocationId`,
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

    console.log("BK-REW-01-3 legacy cleanup gate");
    console.log(`Cultivation units scanned: ${units.length}`);
    console.log(`Issues: ${issues.length}`);

    if (issues.length > 0) {
      console.log("\nBlockers:");
      for (const issue of issues) {
        console.log(`  [${issue.code}] ${issue.entity}: ${issue.detail}`);
      }
      process.exitCode = 1;
    } else {
      console.log("Ready for Phase C (DROP legacy Location columns).");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
