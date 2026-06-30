/**
 * REW-03-5: backfill Plant.cultivationUnitId / locationId → placement fields.
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-plant-placement.ts
 *   npx ts-node src/scripts/backfill-plant-placement.ts --dry-run
 *   npx ts-node src/scripts/backfill-plant-placement.ts --plant-id=<id>
 */
import { PrismaClient } from "@prisma/client";
import {
  backfillPlantPlacements,
  parsePlantPlacementCliArgs,
} from "./backfill-plant-placement.lib";

async function main() {
  const options = parsePlantPlacementCliArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    console.log(
      `REW-03-5 plant placement backfill` +
        `${options.dryRun ? " [dry-run]" : ""}` +
        `${options.plantId ? ` plant=${options.plantId}` : ""}`,
    );

    const stats = await backfillPlantPlacements({
      prisma,
      dryRun: options.dryRun,
      plantId: options.plantId,
    });

    console.log("\nSummary:", stats);
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
