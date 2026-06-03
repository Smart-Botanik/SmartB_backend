import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getValueAtPayloadPath } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { upcastDiaryEventPayload } from "./upcasters/diary-event-upcaster";

type MappingEntry = {
  currentKey: string;
  is_state_field?: boolean;
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
export class DiaryProjectorService {
  static readonly PROJECTOR_VERSION = "v1";
  static readonly HANDLER_VERSION = "diary-projector-v1";

  constructor(private readonly prisma: PrismaService) {}

  buildPatchFromEvent(event: RuntimeEvent): JsonObject {
    const rawPayload = event.payload as unknown;
    if (!isPlainObject(rawPayload)) {
      return {};
    }

    const payload = upcastDiaryEventPayload({
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

        if (entry?.is_state_field === false || typeof entry.currentKey !== "string") {
          continue;
        }

        const value = getValueAtPayloadPath(payload, payloadKey);
        if (value !== undefined) {
          patch[entry.currentKey] = value;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
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

  async projectEventToDiaryCurrent(event: RuntimeEvent): Promise<void> {
    if (event.targetType !== "Diary") {
      return;
    }

    const existing = await (this.prisma as any).diaryProjectionCheckpoint.findUnique({
      where: { eventId: event.id },
    });
    if (existing) {
      return;
    }

    const diary = await this.prisma.diary.findUnique({
      where: { id: event.targetId },
    });
    if (!diary) {
      return;
    }

    const current = (diary.current as JsonObject | null) ?? {};
    const next = this.applyEventToState(current, event);

    await this.prisma.$transaction([
      this.prisma.diary.update({
        where: { id: diary.id },
        data: { current: next as unknown as Prisma.InputJsonValue },
      }),
      (this.prisma as any).diaryProjectionCheckpoint.create({
        data: {
          diaryId: diary.id,
          eventId: event.id,
        },
      }),
    ]);
  }
}
