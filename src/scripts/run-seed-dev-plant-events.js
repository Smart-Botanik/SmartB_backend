"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const seed_dev_plant_events_1 = require("./seed-dev-plant-events");
const prisma = new client_1.PrismaClient();
async function main() {
    const result = await (0, seed_dev_plant_events_1.seedDevPlantEvents)(prisma);
    console.log(`seedDevPlantEvents: plant=${result.plantId} created=${result.created} skipped=${result.skipped}`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=run-seed-dev-plant-events.js.map