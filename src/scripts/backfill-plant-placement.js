"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const backfill_plant_placement_lib_1 = require("./backfill-plant-placement.lib");
async function main() {
    const options = (0, backfill_plant_placement_lib_1.parsePlantPlacementCliArgs)(process.argv.slice(2));
    const prisma = new client_1.PrismaClient();
    try {
        console.log(`REW-03-5 plant placement backfill` +
            `${options.dryRun ? " [dry-run]" : ""}` +
            `${options.plantId ? ` plant=${options.plantId}` : ""}`);
        const stats = await (0, backfill_plant_placement_lib_1.backfillPlantPlacements)({
            prisma,
            dryRun: options.dryRun,
            plantId: options.plantId,
        });
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
//# sourceMappingURL=backfill-plant-placement.js.map