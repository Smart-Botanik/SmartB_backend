"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const seed_dev_location_groups_1 = require("./seed-dev-location-groups");
const prisma = new client_1.PrismaClient();
(0, seed_dev_location_groups_1.seedDevLocationGroups)(prisma)
    .then((result) => {
    console.log("Seeded dev location groups (REW-04):", result);
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=run-seed-dev-location-groups.js.map