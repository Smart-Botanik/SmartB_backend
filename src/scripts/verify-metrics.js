"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const metric_projection_util_1 = require("../modules/metrics/metric-projection.util");
const SEED_PREFIX = "seed:rew-05";
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("REW-05 Metrics verify");
    const metrics = await prisma.metric.findMany({
        where: { name: { startsWith: `${SEED_PREFIX}:` } },
        include: {
            locationMembers: true,
            plantMembers: true,
        },
    });
    if (metrics.length === 0) {
        console.warn("No seed metrics — run npm run db:seed:metrics");
        process.exit(0);
    }
    const issues = [];
    for (const metric of metrics) {
        const directPlantIds = new Set(metric.plantMembers.map((m) => m.plantId));
        const locationIds = metric.locationMembers.map((m) => m.locationId);
        const plants = await prisma.plant.findMany({
            where: {
                OR: [
                    { id: { in: [...directPlantIds] } },
                    ...(locationIds.length > 0
                        ? [
                            { locationId: { in: locationIds } },
                            { plannedLocationId: { in: locationIds } },
                            { currentSeat: { locationId: { in: locationIds } } },
                        ]
                        : []),
                ],
            },
            include: metric_projection_util_1.metricPlantProjectionInclude,
        });
        const projection = (0, metric_projection_util_1.buildMetricPlantProjection)({ plants, directPlantIds });
        console.log(`Metric: ${metric.name}`);
        console.log(`  locations=${metric.locationMembers.length} plants=${metric.plantMembers.length}`);
        console.log(`  projection: planned=${projection.planned.length} queue=${projection.readyToPlant.length} seated=${projection.seated.length} none=${projection.withoutLocation.length}`);
        if (metric.name.endsWith(":full-garden") && projection.planned.length === 0) {
            issues.push("full-garden: expected planned plants in projection");
        }
        if (metric.name.endsWith(":full-garden") && projection.readyToPlant.length === 0) {
            issues.push("full-garden: expected ready_to_plant plants in projection");
        }
        if (metric.name.endsWith(":full-garden") && projection.seated.length === 0) {
            issues.push("full-garden: expected seated plants in projection");
        }
    }
    if (issues.length > 0) {
        console.error("Issues:", issues);
        process.exit(1);
    }
    console.log("Metrics projection checks passed.");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=verify-metrics.js.map