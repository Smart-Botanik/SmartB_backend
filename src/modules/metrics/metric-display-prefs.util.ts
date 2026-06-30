import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

const WIDGET_KINDS = new Set(["location", "plant"]);

/** REW-05 displayPrefs v1: `{ widgets: [{ kind, targetId? }] }` */
export function parseMetricDisplayPrefs(input: unknown): Prisma.InputJsonValue | null | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (input === null) {
    return null;
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new BadRequestException("displayPrefs must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  if (record.widgets !== undefined) {
    if (!Array.isArray(record.widgets)) {
      throw new BadRequestException("displayPrefs.widgets must be an array");
    }
    for (const widget of record.widgets) {
      if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
        throw new BadRequestException("displayPrefs.widgets entries must be objects");
      }
      const kind = (widget as Record<string, unknown>).kind;
      if (typeof kind !== "string" || !WIDGET_KINDS.has(kind)) {
        throw new BadRequestException('displayPrefs.widgets[].kind must be "location" or "plant"');
      }
      const targetId = (widget as Record<string, unknown>).targetId;
      if (targetId !== undefined && targetId !== null && typeof targetId !== "string") {
        throw new BadRequestException("displayPrefs.widgets[].targetId must be a string");
      }
    }
  }
  return record as Prisma.InputJsonValue;
}
