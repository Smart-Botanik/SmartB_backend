/**
 * REW-03: backfill CultivationUnit → unified Location (+ Seats).
 *
 * Idempotent via Location.current._rew003 marker.
 * Does not remove CultivationUnit rows (sunset in REW-03-6).
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-location-unification.ts
 *   npx ts-node src/scripts/backfill-location-unification.ts --dry-run
 *   npx ts-node src/scripts/backfill-location-unification.ts --cultivation-unit-id=<id>
 *   npx ts-node src/scripts/backfill-location-unification.ts --skip-taxonomy
 */
import { LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY } from "@growing/contracts";
import { PrismaClient } from "@prisma/client";
import {
  buildCuToLocationMapping,
  cultivationUnitUnificationInclude,
  detectMultiPlacementIssues,
  markerIncludesUnit,
  mergeRew003Marker,
  parseRew003Marker,
  parseUnificationCliArgs,
  resolveTargetLocationId,
  type CultivationUnitWithRelations,
  type MultiPlacementIssue,
} from "./backfill-location-unification.lib";
import { createTaxonomyPrisma } from "./taxonomy-prisma-for-migration";

type BackfillStats = {
  scanned: number;
  skippedExisting: number;
  skippedNoLocation: number;
  updated: number;
  seatsCreated: number;
  specBlocksCopied: number;
  multiPlacementErrors: number;
};

async function loadEnvironmentTagIds(
  skipTaxonomy: boolean,
): Promise<Map<string, string>> {
  if (skipTaxonomy) {
    return new Map();
  }
  const url = process.env.TAXONOMY_DATABASE_URL?.trim();
  if (!url) {
    console.warn(
      "[warn] TAXONOMY_DATABASE_URL unset — environmentTagId backfill skipped; use --skip-taxonomy to silence",
    );
    return new Map();
  }

  const variantKeys = [
    ...new Set(Object.values(LOCATION_SUB_TYPE_TO_ENVIRONMENT_VARIANT_KEY)),
  ].filter(Boolean) as string[];

  const taxonomy = createTaxonomyPrisma(url);
  try {
    const tags = await taxonomy.taxonomyTag.findMany({
      where: { key: { in: variantKeys } },
      select: { id: true, key: true },
    });
    return new Map(tags.map((t) => [t.key, t.id]));
  } finally {
    await taxonomy.$disconnect();
  }
}

async function backfillUnit(params: {
  prisma: PrismaClient;
  unit: CultivationUnitWithRelations;
  tagIdsByVariantKey: Map<string, string>;
  dryRun: boolean;
  stats: BackfillStats;
  issues: MultiPlacementIssue[];
}): Promise<void> {
  const { prisma, unit, tagIdsByVariantKey, dryRun, stats, issues } = params;

  const placementIssue = detectMultiPlacementIssues(unit);
  if (placementIssue) {
    stats.multiPlacementErrors += 1;
    issues.push(placementIssue);
    console.error(
      `[error:${placementIssue.code}] CU ${unit.id} "${unit.name}" — ${placementIssue.detail}`,
    );
    return;
  }

  const targetLocationId = resolveTargetLocationId(unit);
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

  const marker = parseRew003Marker(location.current);
  if (marker && markerIncludesUnit(marker, unit.id)) {
    stats.skippedExisting += 1;
    console.log(`[skip:existing] CU ${unit.id} → Location ${location.id}`);
    return;
  }

  const mapping = buildCuToLocationMapping({
    unit,
    location,
    tagIdsByVariantKey,
  });

  if (dryRun) {
    stats.updated += 1;
    stats.seatsCreated += mapping.seatCreates.length;
    stats.specBlocksCopied += mapping.specBlockCreates.length;
    console.log(
      `[dry-run] CU ${unit.id} "${unit.name}" → Location ${location.id} ` +
        `(mode=${mapping.seatLayoutMode}, seats=${mapping.seatCreates.length}, ` +
        `specs=${mapping.specBlockCreates.length}, envTag=${mapping.environmentTagId ?? "—"})`,
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.location.findUniqueOrThrow({
      where: { id: location!.id },
      include: {
        specBlocks: { select: { id: true, position: true } },
        seats: { where: { status: "active" }, select: { id: true } },
      },
    });

    const specBlockCreates =
      fresh.specBlocks.length === 0 ? mapping.specBlockCreates : [];
    const seatCreates =
      fresh.seats.length === 0 && mapping.seatCreates.length > 0
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
        ...(fresh.type == null && mapping.type != null && { type: mapping.type }),
        ...(fresh.subType == null && mapping.subType != null && { subType: mapping.subType }),
        ...(fresh.capacity == null && mapping.capacity != null && { capacity: mapping.capacity }),
        seatLayoutMode: fresh.seats.length > 0 ? fresh.seatLayoutMode : mapping.seatLayoutMode,
        ...(mapping.layoutMeta != null &&
          fresh.layoutMeta == null && { layoutMeta: mapping.layoutMeta }),
        occupiedCount: mapping.occupiedCount,
        current: mergeRew003Marker(fresh.current, unit.id),
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
  console.log(
    `[ok] CU ${unit.id} "${unit.name}" → Location ${location.id}`,
  );
}

async function main() {
  const options = parseUnificationCliArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const stats: BackfillStats = {
    scanned: 0,
    skippedExisting: 0,
    skippedNoLocation: 0,
    updated: 0,
    seatsCreated: 0,
    specBlocksCopied: 0,
    multiPlacementErrors: 0,
  };
  const issues: MultiPlacementIssue[] = [];

  try {
    const tagIdsByVariantKey = await loadEnvironmentTagIds(options.skipTaxonomy);

    const units = await prisma.cultivationUnit.findMany({
      where: options.cultivationUnitId ? { id: options.cultivationUnitId } : undefined,
      orderBy: { createdAt: "asc" },
      include: cultivationUnitUnificationInclude,
    });

    if (options.cultivationUnitId && units.length === 0) {
      throw new Error(`CultivationUnit not found: ${options.cultivationUnitId}`);
    }

    console.log(
      `REW-03 location unification: ${units.length} cultivation unit(s)` +
        `${options.dryRun ? " [dry-run]" : ""}`,
    );

    for (const unit of units) {
      stats.scanned += 1;
      await backfillUnit({
        prisma,
        unit: unit as CultivationUnitWithRelations,
        tagIdsByVariantKey,
        dryRun: options.dryRun,
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
