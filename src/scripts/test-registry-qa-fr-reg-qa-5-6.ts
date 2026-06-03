import { PrismaClient, RegistryProfileKind } from "@prisma/client";
import { RegistryService } from "../modules/registry/registry.service";
import { seedRegistryFieldSpecs } from "./seed-registry-field-specs";

const CORE_PLANT_PROFILE_KEYS = [
  "watering.event.v1",
  "watering.chart.v1",
  "current.snapshot.v1",
] as const;

const HUB_PILOT_PROFILE_KEYS = [
  "watering.event.v1",
  "diary.setup.config.v1",
  "location.indoor.equipment.v1",
] as const;

const REGISTRY_PILOT_BUILDER_ENTITIES: Record<string, "Plant" | "Diary" | "Location"> = {
  "watering.event.v1": "Plant",
  "watering.chart.v1": "Plant",
  "current.snapshot.v1": "Plant",
  "diary.setup.config.v1": "Diary",
  "location.indoor.equipment.v1": "Location",
};

const PROFILE_KIND_BY_KEY: Record<string, RegistryProfileKind> = {
  "watering.event.v1": RegistryProfileKind.event_write,
  "watering.chart.v1": RegistryProfileKind.timeseries_read,
  "current.snapshot.v1": RegistryProfileKind.snapshot_build,
  "diary.setup.config.v1": RegistryProfileKind.event_write,
  "location.indoor.equipment.v1": RegistryProfileKind.event_write,
};

type ReadinessLevel = "ready" | "partial" | "pending";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveRegistryReadinessGates(
  fieldSpecCount: number,
  profileKeys: string[],
): {
  backend: ReadinessLevel;
  admin: ReadinessLevel;
  frontend: ReadinessLevel;
} {
  const profileSet = new Set(profileKeys);
  const coreReady = CORE_PLANT_PROFILE_KEYS.every(key => profileSet.has(key));
  const catalogReady = fieldSpecCount > 0;

  const backend: ReadinessLevel =
    catalogReady && coreReady ? "ready" : catalogReady ? "partial" : "pending";

  const admin: ReadinessLevel =
    catalogReady && profileKeys.length >= CORE_PLANT_PROFILE_KEYS.length
      ? coreReady
        ? "ready"
        : "partial"
      : catalogReady
        ? "partial"
        : "pending";

  return {
    backend,
    admin,
    frontend: "pending",
  };
}

async function runQa5(service: RegistryService) {
  const [activeProfiles, activeFieldSpecs] = await Promise.all([
    service.listProfiles({ isActive: true }),
    service.listFieldSpecs({ status: "active" }),
  ]);

  assert(activeProfiles.length >= 5, "FR-REG-QA-5: live snapshot must list seeded active profiles");

  const entities = new Set(activeProfiles.map(profile => profile.entity));
  assert(entities.has("Plant"), "FR-REG-QA-5: live snapshot must include Plant profiles");
  assert(entities.has("Diary"), "FR-REG-QA-5: live snapshot must include Diary profiles");
  assert(entities.has("Location"), "FR-REG-QA-5: live snapshot must include Location profiles");

  const profileByKey = new Map(activeProfiles.map(profile => [profile.key, profile]));
  for (const key of HUB_PILOT_PROFILE_KEYS) {
    assert(profileByKey.has(key), `FR-REG-QA-5: pilot profile ${key} must be active in catalog`);
  }

  for (const key of CORE_PLANT_PROFILE_KEYS) {
    assert(profileByKey.has(key), `FR-REG-QA-5: core Plant profile ${key} must be in live snapshot`);
  }

  assert(activeFieldSpecs.length >= 10, "FR-REG-QA-5: active FieldSpec catalog must be populated");
}

async function runQa6(service: RegistryService) {
  const [activeProfiles, activeFieldSpecs] = await Promise.all([
    service.listProfiles({ isActive: true }),
    service.listFieldSpecs({ status: "active" }),
  ]);

  const gates = resolveRegistryReadinessGates(
    activeFieldSpecs.length,
    activeProfiles.map(profile => profile.key),
  );

  assert(
    gates.backend === "ready",
    `FR-REG-QA-6: backend readiness must be ready after seed, got ${gates.backend}`,
  );
  assert(
    gates.admin === "ready",
    `FR-REG-QA-6: admin readiness must be ready after seed, got ${gates.admin}`,
  );
  assert(
    gates.frontend === "pending",
    "FR-REG-QA-6: main frontend readiness must stay pending until FE-REG-R1…R4",
  );

  const profileByKey = new Map(activeProfiles.map(profile => [profile.key, profile]));

  for (const key of CORE_PLANT_PROFILE_KEYS) {
    const profile = profileByKey.get(key);
    assert(profile, `FR-REG-QA-6: core profile card ${key} must exist`);
    assert(
      profile.kind === PROFILE_KIND_BY_KEY[key],
      `FR-REG-QA-6: ${key} kind must match Current vs Streams policy`,
    );
    assert(
      REGISTRY_PILOT_BUILDER_ENTITIES[key] === "Plant",
      "FR-REG-QA-6: core Plant profiles must open Profile Builder in Plant scope",
    );
  }

  assert(
    profileByKey.get("watering.event.v1")?.kind === RegistryProfileKind.event_write,
    "FR-REG-QA-6: event_write profile for streams write path",
  );
  assert(
    profileByKey.get("watering.chart.v1")?.kind === RegistryProfileKind.timeseries_read,
    "FR-REG-QA-6: timeseries_read profile for chart stream",
  );
  assert(
    profileByKey.get("current.snapshot.v1")?.kind === RegistryProfileKind.snapshot_build,
    "FR-REG-QA-6: snapshot_build profile for current projection",
  );

  for (const [key, entity] of Object.entries(REGISTRY_PILOT_BUILDER_ENTITIES)) {
    const profile = profileByKey.get(key);
    if (!profile) continue;
    assert(
      profile.entity === entity,
      `FR-REG-QA-6: hub card ${key} must map to entity ${entity} for Profile Builder handoff`,
    );
  }
}

async function main() {
  const prisma = new PrismaClient();
  const service = new RegistryService(prisma as never);

  try {
    await seedRegistryFieldSpecs(prisma);
    await runQa5(service);
    await runQa6(service);
    // eslint-disable-next-line no-console
    console.log("FR-REG-QA-5 + FR-REG-QA-6 smoke passed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
