import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

type JsonObject = Record<string, unknown>;

function getValueAtPath(obj: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }
  const parts = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
    if (current === undefined) {
      return undefined;
    }
  }
  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(input: string, errorMessage: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new BadRequestException(errorMessage);
  }
  if (!isPlainObject(parsed)) {
    throw new BadRequestException(errorMessage);
  }
  return parsed;
}

function parseMapping(input: string): Record<string, string> {
  const obj = parseJsonObject(
    input,
    "Invalid mappingJson: expected JSON object",
  );
  const mapping: Record<string, string> = {};

  for (const [payloadKey, currentKey] of Object.entries(obj)) {
    if (typeof currentKey !== "string") {
      throw new BadRequestException(
        "Invalid mappingJson: values must be strings (payloadKey -> currentKey)",
      );
    }
    mapping[payloadKey] = currentKey;
  }

  return mapping;
}

type RegistryConditionRule = {
  field: string;
  operator: "lt" | "gt" | "eq" | "lte" | "gte";
  value: string;
  tagId: string;
};

function parseConditions(input: string): RegistryConditionRule[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new BadRequestException(
      "Invalid conditionsJson: expected JSON array of rules",
    );
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException(
      "Invalid conditionsJson: expected JSON array of rules",
    );
  }

  const rules: RegistryConditionRule[] = [];

  for (const rule of parsed) {
    if (!isPlainObject(rule)) {
      throw new BadRequestException(
        "Invalid conditionsJson: each rule must be an object",
      );
    }

    const field = rule.field;
    const operator = rule.operator;
    const value = rule.value;
    const tagId = rule.tagId;

    if (typeof field !== "string" || field.trim() === "") {
      throw new BadRequestException(
        "Invalid conditionsJson: rule.field is required",
      );
    }
    if (
      operator !== "lt" &&
      operator !== "gt" &&
      operator !== "eq" &&
      operator !== "lte" &&
      operator !== "gte"
    ) {
      throw new BadRequestException(
        "Invalid conditionsJson: rule.operator must be one of lt, gt, eq, lte, gte",
      );
    }
    if (typeof value !== "string" || value.trim() === "") {
      throw new BadRequestException(
        "Invalid conditionsJson: rule.value is required",
      );
    }
    if (typeof tagId !== "string" || tagId.trim() === "") {
      throw new BadRequestException(
        "Invalid conditionsJson: rule.tagId is required",
      );
    }

    rules.push({ field, operator, value, tagId });
  }

  return rules;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(params: {
    limit?: number;
    offset?: number;
    targetType?: string;
    targetId?: string;
    actionPath?: string;
    isSystem?: boolean;
  }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where: Prisma.EventWhereInput = {
      ...(params.targetType ? { targetType: params.targetType } : {}),
      ...(params.targetId ? { targetId: params.targetId } : {}),
      ...(params.actionPath ? { actionPath: params.actionPath } : {}),
      ...(params.isSystem !== undefined ? { isSystem: params.isSystem } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total };
  }

  async listRegistries(params: {
    limit?: number;
    offset?: number;
    targetType?: string;
  }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const where = params.targetType
      ? { targetType: params.targetType }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.actionPathRegistry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          tag: true,
        },
      }),
      this.prisma.actionPathRegistry.count({ where }),
    ]);

    return {
      items,
      total,
    };
  }

  async upsertRegistry(params: {
    actionPath: string;
    targetType: string;
    mappingJson: string;
    conditionsJson?: string;
    tagId?: string | null;
  }) {
    const mapping = parseMapping(params.mappingJson);

    const conditions = params.conditionsJson
      ? (parseConditions(
          params.conditionsJson,
        ) as unknown as Prisma.InputJsonValue)
      : undefined;

    await this.prisma.actionPathRegistry.upsert({
      where: { actionPath: params.actionPath },
      create: {
        actionPath: params.actionPath,
        targetType: params.targetType,
        mapping: mapping as unknown as Prisma.InputJsonValue,
        conditions,
        tagId: params.tagId ?? undefined,
      },
      update: {
        targetType: params.targetType,
        mapping: mapping as unknown as Prisma.InputJsonValue,
        conditions,
        tagId: params.tagId === null ? null : (params.tagId ?? undefined),
      },
    });

    return true;
  }

  async createPlantEvent(params: {
    plantId: string;
    actionPath: string;
    payloadJson: string;
    isSystem?: boolean;
  }) {
    const payload = parseJsonObject(
      params.payloadJson,
      "Invalid payloadJson: expected JSON object",
    );

    const createdEvent = await this.prisma.event.create({
      data: {
        actionPath: params.actionPath,
        targetType: "Plant",
        targetId: params.plantId,
        payload: payload as unknown as Prisma.InputJsonValue,
        isSystem: params.isSystem ?? false,
      },
    });

    const plant = await this.prisma.plant.findUnique({
      where: { id: params.plantId },
    });
    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    const registry = await this.prisma.actionPathRegistry.findUnique({
      where: { actionPath: params.actionPath },
    });

    if (!registry) {
      // No mapping configured; event is still stored.
      // We still may want to apply derived fields (e.g. watering -> last_* fields).
    }

    if (registry && registry.targetType !== "Plant") {
      throw new BadRequestException(
        `Registry targetType mismatch for actionPath=${params.actionPath}`,
      );
    }

    const mapping = registry
      ? (registry.mapping as Record<string, string>)
      : null;
    const patch: Record<string, unknown> = {};

    if (mapping) {
      for (const [payloadKey, currentKey] of Object.entries(mapping)) {
        const value = getValueAtPath(payload, payloadKey);
        if (value !== undefined) {
          patch[currentKey] = value;
        }
      }
    }

    const watering = getValueAtPath(payload, "watering");
    if (isPlainObject(watering)) {
      patch.last_watered_at = createdEvent.timestamp.toISOString();

      const nutrient = getValueAtPath(watering, "nutrient");
      const drainage = getValueAtPath(watering, "drainage");

      const ph =
        (typeof getValueAtPath(nutrient, "ph") === "number"
          ? (getValueAtPath(nutrient, "ph") as number)
          : undefined) ??
        (typeof getValueAtPath(drainage, "ph") === "number"
          ? (getValueAtPath(drainage, "ph") as number)
          : undefined);
      const ppm =
        (typeof getValueAtPath(nutrient, "ppm") === "number"
          ? (getValueAtPath(nutrient, "ppm") as number)
          : undefined) ??
        (typeof getValueAtPath(drainage, "ppm") === "number"
          ? (getValueAtPath(drainage, "ppm") as number)
          : undefined);

      if (ph !== undefined) {
        patch.last_ph = ph;
      }
      if (ppm !== undefined) {
        patch.last_ppm = ppm;
      }
    }

    if (Object.keys(patch).length === 0) {
      return plant;
    }

    const current = (plant.current as Record<string, unknown> | null) ?? {};
    const updatedCurrent = {
      ...current,
      ...patch,
    };

    return this.prisma.plant.update({
      where: { id: params.plantId },
      data: {
        current: updatedCurrent as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
