"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_service_1 = require("../modules/events/events.service");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function main() {
    const plantId = "plant-det-1";
    const asOf = new Date("2026-04-15T12:00:00.000Z");
    const events = [
        {
            id: "e1",
            targetType: "Plant",
            targetId: plantId,
            timestamp: new Date("2026-04-15T10:00:00.000Z"),
            payload: { stage: "seedling" },
        },
        {
            id: "e2",
            targetType: "Plant",
            targetId: plantId,
            timestamp: new Date("2026-04-15T11:00:00.000Z"),
            payload: { moisture: 42 },
        },
    ];
    const fakePrisma = {
        plantSnapshot: {
            findFirst: async () => null,
        },
        event: {
            findMany: async () => events,
        },
    };
    const fakeProjector = {
        applyEventToState: (state, event) => ({
            ...state,
            ...event.payload,
        }),
    };
    const fakeLocationProjector = {
        applyEventToState: (state, event) => ({
            ...state,
            ...event.payload,
        }),
    };
    const fakeDiaryProjector = {};
    const service = new events_service_1.EventsService(fakePrisma, fakeDiaryProjector, fakeProjector, fakeLocationProjector);
    const first = await service.replayPlantStateAt(plantId, asOf);
    const second = await service.replayPlantStateAt(plantId, asOf);
    assert(JSON.stringify(first) === JSON.stringify(second), "Determinism check failed: replay results differ between runs");
    assert(first.stage === "seedling", "Expected stage from first event");
    assert(first.moisture === 42, "Expected moisture from second event");
    console.log("Determinism test passed");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=test-plant-replay-determinism.js.map