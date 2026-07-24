"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const seed_dev_plant_placement_1 = require("./seed-dev-plant-placement");
const prisma = new client_1.PrismaClient();
(0, seed_dev_plant_placement_1.seedDevPlantPlacement)(prisma)
    .then((result) => {
    console.log("Seeded dev plant placement (REW-06):", result);
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=run-seed-dev-plant-placement.js.map