"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_service_1 = require("../modules/events/events.service");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function byTimeThenId(a, b) {
    const t = a.timestamp.getTime() - b.timestamp.getTime();
    return t !== 0 ? t : a.id.localeCompare(b.id);
}
function eventMatchesWhere(event, where) {
    if (where.targetType && event.targetType !== where.targetType) {
        return false;
    }
    if (where.targetId && event.targetId !== where.targetId) {
        return false;
    }
    if (where.timestamp?.lte && event.timestamp > where.timestamp.lte) {
        return false;
    }
    if (where.timestamp?.gt && event.timestamp <= where.timestamp.gt) {
        return false;
    }
    return true;
}
async function main() {
    const plantId = "plant-boundary-1";
    const asOf = new Date("2026-04-15T12:00:00.000Z");
    const snapshotTs = new Date("2026-04-15T10:00:00.000Z");
    const events = [
        {
            id: "a",
            targetType: "Plant",
            targetId: plantId,
            timestamp: snapshotTs,
            payload: { fromSnapshotBoundary: true },
        },
        {
            id: "b",
            targetType: "Plant",
            targetId: plantId,
            timestamp: new Date("2026-04-15T11:00:00.000Z"),
            payload: { mid: 1 },
        },
        {
            id: "c",
            targetType: "Plant",
            targetId: plantId,
            timestamp: asOf,
            payload: { atAsOf: true },
        },
        {
            id: "d",
            targetType: "Plant",
            targetId: plantId,
            timestamp: new Date("2026-04-15T12:00:01.000Z"),
            payload: { afterAsOf: true },
        },
    ];
    let capturedWhere;
    const fakePrisma = {
        plantSnapshot: {
            findFirst: async () => ({
                state: { base: "snapshot" },
                asOfTimestamp: snapshotTs,
            }),
        },
        event: {
            findMany: async (args) => {
                capturedWhere = args.where;
                return events
                    .filter((event) => eventMatchesWhere(event, args.where))
                    .sort(byTimeThenId);
            },
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
    const state = await service.replayPlantStateAt(plantId, asOf);
    assert(capturedWhere !== undefined, "Expected replay query to be executed");
    assert(capturedWhere?.timestamp?.lte?.toISOString() === asOf.toISOString(), "Expected asOf to be inclusive (lte)");
    assert(capturedWhere?.timestamp?.gt?.toISOString() === snapshotTs.toISOString(), "Expected snapshot boundary to be exclusive (gt)");
    assert(state.base === "snapshot", "Expected snapshot base state to be used");
    assert(state.mid === 1, "Expected event between snapshot and asOf to be applied");
    assert(state.atAsOf === true, "Expected event exactly at asOf to be included");
    assert(state.fromSnapshotBoundary !== true, "Expected event exactly at snapshot timestamp to be excluded");
    assert(state.afterAsOf !== true, "Expected event after asOf to be excluded");
    console.log("Time boundary test passed");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=test-plant-replay-time-boundary.js.map