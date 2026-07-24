"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../infrastructure/prisma/prisma.service");
const events_service_1 = require("../modules/events/events.service");
const app_module_1 = require("../app.module");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ["error", "warn"],
    });
    try {
        const prisma = app.get(prisma_service_1.PrismaService);
        const eventsService = app.get(events_service_1.EventsService);
        const plants = await prisma.plant.findMany({
            select: { id: true, current: true },
        });
        let mismatches = 0;
        for (const plant of plants) {
            const replayed = await eventsService.replayPlantStateAt(plant.id, new Date());
            const current = (plant.current ?? {});
            if (JSON.stringify(current) !== JSON.stringify(replayed)) {
                mismatches += 1;
            }
        }
        if (mismatches > 0) {
            throw new Error(`Replay verification failed for ${mismatches} plants`);
        }
        console.log(`Replay verification passed for ${plants.length} plants`);
    }
    finally {
        await app.close();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=verify-plant-replay.js.map