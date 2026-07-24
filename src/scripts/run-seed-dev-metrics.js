"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const seed_dev_metrics_1 = require("./seed-dev-metrics");
const prisma = new client_1.PrismaClient();
(0, seed_dev_metrics_1.seedDevMetrics)(prisma)
    .then((result) => {
    console.log("Seeded dev metrics (REW-05):", result);
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=run-seed-dev-metrics.js.map