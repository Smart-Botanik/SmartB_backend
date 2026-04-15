import { EventsService } from "../modules/events/events.service";

type RuntimeEvent = {
  id: string;
  targetType: string;
  targetId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const plantId = "plant-det-1";
  const asOf = new Date("2026-04-15T12:00:00.000Z");

  const events: RuntimeEvent[] = [
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
    applyEventToState: (
      state: Record<string, unknown>,
      event: { payload: Record<string, unknown> },
    ) => ({
      ...state,
      ...event.payload,
    }),
  };

  const fakeLocationProjector = {
    applyEventToState: (
      state: Record<string, unknown>,
      event: { payload: Record<string, unknown> },
    ) => ({
      ...state,
      ...event.payload,
    }),
  };

  const service = new EventsService(
    fakePrisma as any,
    fakeProjector as any,
    fakeLocationProjector as any,
  );
  const first = await service.replayPlantStateAt(plantId, asOf);
  const second = await service.replayPlantStateAt(plantId, asOf);

  assert(
    JSON.stringify(first) === JSON.stringify(second),
    "Determinism check failed: replay results differ between runs",
  );
  assert(first.stage === "seedling", "Expected stage from first event");
  assert(first.moisture === 42, "Expected moisture from second event");

  // eslint-disable-next-line no-console
  console.log("Determinism test passed");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
