import type { PrismaClient } from "@prisma/client";
import { PLANT_GROWTH_ACTION_PATH_STRINGS, PLANT_HEALTH_ACTION_PATH_STRINGS } from "@growing/contracts";

const SEED_PREFIX = "seed:rew-07";

export async function seedDevPlantEvents(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { email: "user@growingapp.com" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("seedDevPlantEvents: user@growingapp.com not found — run user seed first");
  }

  const seatedPlant = await prisma.plant.findFirst({
    where: { userId: user.id, name: "seed:rew-06:seated" },
    select: { id: true, name: true },
  });
  if (!seatedPlant) {
    throw new Error("seedDevPlantEvents: seed:rew-06:seated not found — run db:seed:plant-placement");
  }

  const marker = `${SEED_PREFIX}:events`;
  const existing = await prisma.event.count({
    where: {
      targetType: "Plant",
      targetId: seatedPlant.id,
      actionPath: PLANT_HEALTH_ACTION_PATH_STRINGS.resolve,
      payload: { string_contains: marker },
    },
  });
  if (existing > 0) {
    console.log(`seedDevPlantEvents: already seeded (${existing} events)`);
    return { plantId: seatedPlant.id, created: 0, skipped: true };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const events = [
    {
      actionPath: PLANT_GROWTH_ACTION_PATH_STRINGS.watering,
      timestamp: new Date(now - 5 * dayMs),
      payload: {
        seedMarker: marker,
        watering: {
          solution: { ph: { value: 6.1, unit: "ph" }, tds: { value: 820, unit: "ppm" } },
          drainage: { ph: { value: 6.3, unit: "ph" }, tds: { value: 760, unit: "ppm" } },
        },
      },
    },
    {
      actionPath: PLANT_GROWTH_ACTION_PATH_STRINGS.watering,
      timestamp: new Date(now - 2 * dayMs),
      payload: {
        seedMarker: marker,
        watering: {
          solution: { ph: { value: 6.4, unit: "ph" }, tds: { value: 900, unit: "ppm" } },
          drainage: { ph: { value: 6.5, unit: "ph" }, tds: { value: 810, unit: "ppm" } },
        },
      },
    },
    {
      actionPath: PLANT_HEALTH_ACTION_PATH_STRINGS.treatment,
      timestamp: new Date(now - 4 * dayMs),
      payload: {
        seedMarker: marker,
        treatment: {
          product: "Pest_Spider_Mite",
          method: "Neem oil spray",
          notes: "Lower leaves",
        },
      },
    },
    {
      actionPath: PLANT_HEALTH_ACTION_PATH_STRINGS.update,
      timestamp: new Date(now - 3 * dayMs),
      payload: {
        seedMarker: marker,
        treatment: {
          product: "Pest_Spider_Mite",
          method: "Repeat spray",
          notes: "Day 2 follow-up",
        },
      },
    },
    {
      actionPath: PLANT_HEALTH_ACTION_PATH_STRINGS.resolve,
      timestamp: new Date(now - 1 * dayMs),
      payload: {
        seedMarker: marker,
        treatment: {
          product: "Pest_Spider_Mite",
          notes: "No new spots",
        },
      },
    },
  ];

  for (const event of events) {
    await prisma.event.create({
      data: {
        actionPath: event.actionPath,
        targetType: "Plant",
        targetId: seatedPlant.id,
        payload: event.payload,
        timestamp: event.timestamp,
        handlerVersion: "plant-projector-v1",
      },
    });
  }

  return { plantId: seatedPlant.id, created: events.length, skipped: false };
}
