import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getValueAtPayloadPath } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { upcastPlantEventPayload } from "./upcasters/plant-event-upcaster";

type MappingEntry = {
  currentKey: string;
  is_state_field: boolean;
};

type JsonObject = Record<string, unknown>;
type RuntimeEvent = {
  id: string;
  actionPath: string;
  targetType: string;
  targetId: string;
  payload: unknown;
  timestamp: Date;
  registrySnapshot?: unknown;
  payloadSchemaVersion?: string | null;
};

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRegistrySnapshot(
  raw: unknown,
): { mapping?: Record<string, MappingEntry | string> } | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  return raw as { mapping?: Record<string, MappingEntry | string> };
}

@Injectable()
export class PlantProjectorService {
  static readonly PROJECTOR_VERSION = "v1";
  static readonly HANDLER_VERSION = "plant-projector-v1";

  constructor(private readonly prisma: PrismaService) {}

  buildPatchFromEvent(event: RuntimeEvent): JsonObject {
    const rawPayload = event.payload as unknown;
    if (!isPlainObject(rawPayload)) {
      return {};
    }

    const payload = upcastPlantEventPayload({
      payload: rawPayload,
      payloadSchemaVersion: event.payloadSchemaVersion,
    });

    const patch: JsonObject = {};
    const snapshot = parseRegistrySnapshot(event.registrySnapshot);
    const mapping = snapshot?.mapping;

    if (mapping && isPlainObject(mapping)) {
      for (const [payloadKey, rawEntry] of Object.entries(mapping)) {
        const entry: MappingEntry =
          typeof rawEntry === "string"
            ? { currentKey: rawEntry, is_state_field: true }
            : (rawEntry as MappingEntry);

        if (!entry?.is_state_field || typeof entry.currentKey !== "string") {
          continue;
        }

        const value = getValueAtPayloadPath(payload, payloadKey);
        if (value !== undefined) {
          this.setValueAtPath(patch, entry.currentKey, value);
        }
      }
    }

    const watering = getValueAtPayloadPath(payload, "watering");
    if (isPlainObject(watering)) {
      patch.last_watered_at = event.timestamp.toISOString();

      const nutrient = getValueAtPayloadPath(watering, "nutrient");
      const solution = getValueAtPayloadPath(watering, "solution");
      const nutrientOrSolution = isPlainObject(nutrient)
        ? nutrient
        : isPlainObject(solution)
          ? solution
          : null;
      const drainage = getValueAtPayloadPath(watering, "drainage");

      const ph =
        (typeof getValueAtPayloadPath(nutrientOrSolution, "ph") === "number"
          ? (getValueAtPayloadPath(nutrientOrSolution, "ph") as number)
          : undefined) ??
        (typeof getValueAtPayloadPath(drainage, "ph") === "number"
          ? (getValueAtPayloadPath(drainage, "ph") as number)
          : undefined);

      const ppm =
        (typeof getValueAtPayloadPath(nutrientOrSolution, "ppm") === "number"
          ? (getValueAtPayloadPath(nutrientOrSolution, "ppm") as number)
          : undefined) ??
        (typeof getValueAtPayloadPath(nutrientOrSolution, "tds") === "number"
          ? (getValueAtPayloadPath(nutrientOrSolution, "tds") as number)
          : undefined) ??
        (typeof getValueAtPayloadPath(drainage, "ppm") === "number"
          ? (getValueAtPayloadPath(drainage, "ppm") as number)
          : undefined) ??
        (typeof getValueAtPayloadPath(drainage, "tds") === "number"
          ? (getValueAtPayloadPath(drainage, "tds") as number)
          : undefined);

      if (ph !== undefined) {
        patch.last_ph = ph;
      }
      if (ppm !== undefined) {
        patch.last_ppm = ppm;
      }
    }

    if (event.actionPath === "plant.health.resolve") {
      patch.health_issue_active = false;
      patch.treatment_resolved_at = event.timestamp.toISOString();
    } else if (
      event.actionPath === "plant.health.treatment" ||
      event.actionPath === "plant.health.update"
    ) {
      patch.health_issue_active = true;
    }

    return patch;
  }

  applyEventToState(state: JsonObject, event: RuntimeEvent): JsonObject {
    const patch = this.buildPatchFromEvent(event);
    if (Object.keys(patch).length === 0) {
      return state;
    }
    return this.mergeDeep(state, patch);
  }

  private setValueAtPath(
    target: JsonObject,
    path: string,
    value: unknown,
  ): void {
    const segments = path.split(".");
    let cursor: JsonObject = target;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;

      if (isLeaf) {
        cursor[segment] = value;
        return;
      }

      const next = cursor[segment];
      if (next === undefined) {
        cursor[segment] = {};
      } else if (!isPlainObject(next)) {
        cursor[segment] = {};
      }

      cursor = cursor[segment] as JsonObject;
    }
  }

  private mergeDeep(base: JsonObject, patch: JsonObject): JsonObject {
    const out: JsonObject = { ...base };

    for (const [key, value] of Object.entries(patch)) {
      if (isPlainObject(value) && isPlainObject(out[key])) {
        out[key] = this.mergeDeep(out[key] as JsonObject, value);
      } else {
        out[key] = value;
      }
    }

    return out;
  }

  async projectEventToPlantCurrent(event: RuntimeEvent): Promise<void> {
    if (event.targetType !== "Plant") {
      return;
    }

    const existing = await (this.prisma as any).plantProjectionCheckpoint.findUnique({
      where: { eventId: event.id },
    });
    if (existing) {
      return;
    }

    const plant = await this.prisma.plant.findUnique({ where: { id: event.targetId } });
    if (!plant) {
      return;
    }

    const current = (plant.current as JsonObject | null) ?? {};
    const next = this.applyEventToState(current, event);

    await this.prisma.$transaction([
      this.prisma.plant.update({
        where: { id: plant.id },
        data: { current: next as unknown as Prisma.InputJsonValue },
      }),
      (this.prisma as any).plantProjectionCheckpoint.create({
        data: {
          plantId: plant.id,
          eventId: event.id,
        },
      }),
    ]);
  }
}
