import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getValueAtPayloadPath } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { upcastLocationEventPayload } from "./upcasters/location-event-upcaster";

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
export class LocationProjectorService {
  static readonly PROJECTOR_VERSION = "v1";
  static readonly HANDLER_VERSION = "location-projector-v1";

  constructor(private readonly prisma: PrismaService) {}

  buildPatchFromEvent(event: RuntimeEvent): JsonObject {
    const rawPayload = event.payload as unknown;
    if (!isPlainObject(rawPayload)) {
      return {};
    }

    const payload = upcastLocationEventPayload({
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
          patch[entry.currentKey] = value;
        }
      }
    }

    const profile = getValueAtPayloadPath(payload, "location");
    if (isPlainObject(profile)) {
      patch.profile = profile;
    }

    const occupancy = getValueAtPayloadPath(payload, "occupancy");
    if (isPlainObject(occupancy)) {
      patch.occupancy = occupancy;
      const occupiedSlots = getValueAtPayloadPath(occupancy, "occupied_slots");
      const capacity = getValueAtPayloadPath(occupancy, "capacity");
      if (
        typeof occupiedSlots === "number" &&
        typeof capacity === "number" &&
        capacity > 0
      ) {
        patch.occupancy = {
          ...occupancy,
          ratio: occupiedSlots / capacity,
        };
      }
    }

    if (event.actionPath.startsWith("location.specs.")) {
      const specs = getValueAtPayloadPath(payload, "specs");
      if (isPlainObject(specs)) {
        patch.specs = specs;
      }
    }

    if (patch.profile || patch.occupancy || patch.specs) {
      patch.provenance = {
        lastEventId: event.id,
        lastActionPath: event.actionPath,
        lastUpdatedAt: event.timestamp.toISOString(),
      };
    }

    return patch;
  }

  applyEventToState(state: JsonObject, event: RuntimeEvent): JsonObject {
    const patch = this.buildPatchFromEvent(event);
    if (Object.keys(patch).length === 0) {
      return state;
    }

    return { ...state, ...patch };
  }

  async projectEventToLocationCurrent(event: RuntimeEvent): Promise<void> {
    if (event.targetType !== "Location") {
      return;
    }

    const existing = await (
      this.prisma as any
    ).locationProjectionCheckpoint.findUnique({
      where: { eventId: event.id },
    });
    if (existing) {
      return;
    }

    const location = await this.prisma.location.findUnique({
      where: { id: event.targetId },
    });
    if (!location) {
      return;
    }

    const current = (location.current as JsonObject | null) ?? {};
    const next = this.applyEventToState(current, event);

    await this.prisma.$transaction([
      this.prisma.location.update({
        where: { id: location.id },
        data: { current: next as unknown as Prisma.InputJsonValue },
      }),
      (this.prisma as any).locationProjectionCheckpoint.create({
        data: {
          locationId: location.id,
          eventId: event.id,
        },
      }),
    ]);
  }
}
