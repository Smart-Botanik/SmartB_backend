import { PrismaClient } from "@prisma/client";
import { PLANT_HEALTH_ACTION_PATH_STRINGS } from "@growing/contracts";

import { MetricsService } from "../modules/metrics/metrics.service";
import { EventsService } from "../modules/events/events.service";
import { PlantService } from "../modules/plant/plant.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

const prisma = new PrismaClient();

async function main() {
  console.log("REW-07 metric read-models verify");

  const metric = await prisma.metric.findFirst({
    where: { name: { startsWith: "seed:rew-05:" } },
    select: { id: true, name: true, userId: true },
  });

  if (!metric) {
    console.warn("No seed metric — run npm run db:seed:metrics");
    process.exit(0);
  }

  const prismaService = new PrismaService();
  const metricsService = new MetricsService(
    prismaService,
    new PlantService(prismaService),
    new EventsService(prismaService, {} as never, {} as never, {} as never),
  );

  const activity = await metricsService.listActivity({
    userId: metric.userId,
    metricId: metric.id,
    limit: 20,
  });
  console.log(
    `  metricActivity (${metric.name}): ${activity.total} event(s), page=${activity.items.length}`,
  );

  const chart = await metricsService.buildWateringChart({
    userId: metric.userId,
    metricId: metric.id,
  });
  const pointCount = chart.series.reduce((sum, series) => sum + series.points.length, 0);
  console.log(
    `  metricWateringChart: ${chart.series.length} series, ${pointCount} point(s), profile=${chart.profileKey}`,
  );

  const healthPaths = Object.values(PLANT_HEALTH_ACTION_PATH_STRINGS);
  const registryRows = await prisma.actionPathRegistry.findMany({
    where: { actionPath: { in: healthPaths } },
    select: { actionPath: true },
  });
  const registrySet = new Set(registryRows.map((row) => row.actionPath));
  for (const path of healthPaths) {
    console.log(`  registry ${path}: ${registrySet.has(path) ? "OK" : "MISSING"}`);
  }

  const healthEvents = await prisma.event.count({
    where: {
      targetType: "Plant",
      actionPath: { in: healthPaths },
    },
  });
  console.log(`  health events (all plants): ${healthEvents}`);

  if (activity.total === 0) {
    console.warn("No metric activity — run npm run db:seed:plant-events");
  }
  if (pointCount === 0) {
    console.warn("No watering chart points — run npm run db:seed:plant-events");
  }

  console.log("Metric read-models verify passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
