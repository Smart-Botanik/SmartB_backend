import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { EventsService } from "../modules/events/events.service";
import { AppModule } from "../app.module";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const prisma = app.get(PrismaService);
    const eventsService = app.get(EventsService);

    const plants = await prisma.plant.findMany({
      select: { id: true, current: true },
    });

    let mismatches = 0;
    for (const plant of plants) {
      const replayed = await eventsService.replayPlantStateAt(plant.id, new Date());
      const current = (plant.current ?? {}) as Record<string, unknown>;
      if (JSON.stringify(current) !== JSON.stringify(replayed)) {
        mismatches += 1;
      }
    }

    if (mismatches > 0) {
      throw new Error(`Replay verification failed for ${mismatches} plants`);
    }

    // eslint-disable-next-line no-console
    console.log(`Replay verification passed for ${plants.length} plants`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
