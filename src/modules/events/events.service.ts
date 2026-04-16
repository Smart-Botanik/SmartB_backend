import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { validateAutoTagRulesInput } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { LocationProjectorService } from "./location-projector.service";
import { PlantProjectorService } from "./plant-projector.service";

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

type MappingEntry = {
  currentKey: string;
  is_state_field: boolean;
};

function parseSchemaJson(input: string): JsonObject {
  return parseJsonObject(input, "Invalid schemaJson: expected JSON object");
}

function parseMapping(input: string): Record<string, MappingEntry> {
  const obj = parseJsonObject(
    input,
    "Invalid mappingJson: expected JSON object",
  );

  const mapping: Record<string, MappingEntry> = {};

  for (const [payloadKey, raw] of Object.entries(obj)) {
    if (typeof raw === "string") {
      mapping[payloadKey] = {
        currentKey: raw,
        is_state_field: true,
      };
      continue;
    }

    if (!isPlainObject(raw)) {
      throw new BadRequestException(
        "Invalid mappingJson: values must be strings or objects",
      );
    }

    const currentKey = raw.currentKey;
    const isStateField = raw.is_state_field;
    if (typeof currentKey !== "string" || currentKey.trim() === "") {
      throw new BadRequestException(
        "Invalid mappingJson: mapping entry currentKey must be a non-empty string",
      );
    }
    if (typeof isStateField !== "boolean") {
      throw new BadRequestException(
        "Invalid mappingJson: mapping entry is_state_field must be a boolean",
      );
    }

    mapping[payloadKey] = {
      currentKey,
      is_state_field: isStateField,
    };
  }

  return mapping;
}

function validateValueAgainstSchema(params: {
  value: unknown;
  schema: unknown;
  context: string;
}) {
  if (!params.schema) {
    return;
  }

  const schema = params.schema;

  if (!isPlainObject(schema)) {
    throw new BadRequestException(
      `Invalid schema for ${params.context}: expected JSON object`,
    );
  }

  const schemaError = (message: string) =>
    new BadRequestException(`Invalid schema for ${params.context}: ${message}`);

  const payloadError = (path: string, message: string) =>
    new BadRequestException(`Invalid ${params.context}: ${path} ${message}`);

  const validateNode = (value: unknown, nodeSchema: unknown, path: string) => {
    if (!isPlainObject(nodeSchema)) {
      throw schemaError(`${path} schema must be an object`);
    }

    const oneOf = (nodeSchema as Record<string, unknown>).oneOf;
    if (oneOf !== undefined) {
      if (!Array.isArray(oneOf) || oneOf.length === 0) {
        throw schemaError(`${path}.oneOf must be a non-empty array`);
      }

      let lastErr: unknown;
      for (let i = 0; i < oneOf.length; i += 1) {
        try {
          validateNode(value, oneOf[i], path);
          return;
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr instanceof Error
        ? lastErr
        : payloadError(path, "does not match any allowed schema");
    }

    const expectedType = (nodeSchema as Record<string, unknown>).type;
    if (expectedType !== undefined && typeof expectedType !== "string") {
      throw schemaError(`${path}.type must be a string`);
    }

    const enumValues = (nodeSchema as Record<string, unknown>).enum;
    if (enumValues !== undefined) {
      if (
        !Array.isArray(enumValues) ||
        !enumValues.every((x) => typeof x === "string")
      ) {
        throw schemaError(`${path}.enum must be string[]`);
      }
      if (typeof value !== "string") {
        throw payloadError(path, "must be a string");
      }
      if (!enumValues.includes(value)) {
        throw payloadError(path, `must be one of: ${enumValues.join(", ")}`);
      }
    }

    if (expectedType === "object") {
      if (!isPlainObject(value)) {
        throw payloadError(path, "must be an object");
      }

      const required = (nodeSchema as Record<string, unknown>).required;
      if (required !== undefined) {
        if (
          !Array.isArray(required) ||
          !required.every((x) => typeof x === "string")
        ) {
          throw schemaError(`${path}.required must be string[]`);
        }
        for (const key of required) {
          if ((value as Record<string, unknown>)[key] === undefined) {
            throw payloadError(`${path}.${key}`, "is required");
          }
        }
      }

      const properties = (nodeSchema as Record<string, unknown>).properties;
      if (properties !== undefined) {
        if (!isPlainObject(properties)) {
          throw schemaError(`${path}.properties must be an object`);
        }

        for (const [key, childSchema] of Object.entries(properties)) {
          const childValue = (value as Record<string, unknown>)[key];
          if (childValue === undefined) {
            continue;
          }
          validateNode(childValue, childSchema, `${path}.${key}`);
        }
      }

      return;
    }

    if (expectedType === "array") {
      if (!Array.isArray(value)) {
        throw payloadError(path, "must be an array");
      }

      const minItems = (nodeSchema as Record<string, unknown>).minItems;
      if (minItems !== undefined) {
        if (
          typeof minItems !== "number" ||
          !Number.isFinite(minItems) ||
          minItems < 0
        ) {
          throw schemaError(`${path}.minItems must be a non-negative number`);
        }
        if (value.length < minItems) {
          throw payloadError(path, `must have at least ${minItems} items`);
        }
      }

      const items = (nodeSchema as Record<string, unknown>).items;
      if (items !== undefined) {
        for (let i = 0; i < value.length; i += 1) {
          validateNode(value[i], items, `${path}[${i}]`);
        }
      }

      return;
    }

    if (expectedType === "string") {
      if (typeof value !== "string") {
        throw payloadError(path, "must be a string");
      }
      return;
    }

    if (expectedType === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw payloadError(path, "must be a number");
      }
      return;
    }

    if (expectedType === "boolean") {
      if (typeof value !== "boolean") {
        throw payloadError(path, "must be a boolean");
      }
      return;
    }
  };

  validateNode(params.value, schema, "$");
}

function validatePayloadAgainstSchema(params: {
  payload: unknown;
  schema: unknown;
  actionPath: string;
}) {
  validateValueAgainstSchema({
    value: params.payload,
    schema: params.schema,
    context: `payload:${params.actionPath}`,
  });
}

function parseConditions(input: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new BadRequestException("Invalid conditionsJson: expected JSON");
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!isPlainObject(parsed)) {
    throw new BadRequestException(
      "Invalid conditionsJson: expected JSON object or array",
    );
  }

  const autoTagRulesSchema = {
    type: "object",
    properties: {
      auto_tag_rules: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "tag_id", "conditions"],
          properties: {
            name: { type: "string" },
            tag_id: { type: "string" },
            logic: { type: "string", enum: ["AND", "OR"] },
            conditions: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["field", "operator", "value"],
                properties: {
                  field: { type: "string" },
                  operator: {
                    type: "string",
                    enum: ["lt", "gt", "eq", "lte", "gte"],
                  },
                  value: {
                    oneOf: [{ type: "number" }, { type: "string" }],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  if ((parsed as Record<string, unknown>).auto_tag_rules !== undefined) {
    validateValueAgainstSchema({
      value: parsed,
      schema: autoTagRulesSchema,
      context: "conditionsJson",
    });

    const rules = (parsed as any).auto_tag_rules as any[];
    for (let i = 0; i < rules.length; i += 1) {
      const r = rules[i];
      const hasLogic = r.logic === "AND" || r.logic === "OR";
      const min = hasLogic ? 2 : 1;
      if (!Array.isArray(r.conditions) || r.conditions.length < min) {
        throw new BadRequestException(
          `Invalid conditionsJson.auto_tag_rules[${i}].conditions: must have at least ${min} items`,
        );
      }
    }
  }

  return parsed;
}

function parseAutoTagRulesJson(input: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new BadRequestException("Invalid autoTagRulesJson: expected JSON");
  }

  const result = validateAutoTagRulesInput(parsed);
  if (!result.ok) {
    throw new BadRequestException(result.errors.join("; "));
  }

  return result.rules;
}

@Injectable()
export class EventsService {
  private readonly projectionOnlyMode =
    process.env.EVENTS_PROJECTION_ONLY === "true";
  private readonly syncProjectorEnabled =
    process.env.EVENTS_SYNC_PROJECTOR !== "false";

  constructor(
    private readonly prisma: PrismaService,
    private readonly plantProjector: PlantProjectorService,
    private readonly locationProjector: LocationProjectorService,
  ) {}

  async listRegistryGroups() {
    try {
      return (this.prisma as any).actionPathRegistryGroup.findMany({
        orderBy: [{ order: "asc" }, { path: "asc" }],
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (
        msg.includes("ActionPathRegistryGroup.order") &&
        msg.includes("does not exist")
      ) {
        return (this.prisma as any).actionPathRegistryGroup.findMany({
          orderBy: { path: "asc" },
        });
      }
      throw e;
    }
  }

  async createRegistryGroup(params: { path: string; description?: string }) {
    const path = params.path.trim();
    if (!path) {
      throw new BadRequestException("Group path is required");
    }

    try {
      const last = await (this.prisma as any).actionPathRegistryGroup.findFirst(
        {
          orderBy: { order: "desc" },
          select: { order: true },
        },
      );
      const nextOrder = typeof last?.order === "number" ? last.order + 1 : 0;

      return (this.prisma as any).actionPathRegistryGroup.create({
        data: {
          path,
          description: params.description ?? "",
          order: nextOrder,
        },
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (
        msg.includes("ActionPathRegistryGroup.order") &&
        msg.includes("does not exist")
      ) {
        return (this.prisma as any).actionPathRegistryGroup.create({
          data: {
            path,
            description: params.description ?? "",
          },
        });
      }
      throw e;
    }
  }

  async updateRegistryGroup(params: {
    id: string;
    path?: string;
    description?: string;
  }) {
    const existing = await (
      this.prisma as any
    ).actionPathRegistryGroup.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      throw new NotFoundException("ActionPathRegistryGroup not found");
    }

    const nextPath = params.path?.trim();
    if (nextPath !== undefined && !nextPath) {
      throw new BadRequestException("Group path is required");
    }

    return (this.prisma as any).actionPathRegistryGroup.update({
      where: { id: params.id },
      data: {
        path: nextPath ?? undefined,
        description: params.description ?? undefined,
      },
    });
  }

  async updateActionPathRegistryGroupsOrder(
    input: Array<{ id: string; order: number }>,
  ) {
    if (!Array.isArray(input) || input.length === 0) {
      throw new BadRequestException("input is required");
    }

    const ids = input.map((x) => x.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException("Duplicate ids in input");
    }

    const groups = await (this.prisma as any).actionPathRegistryGroup.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (groups.length !== ids.length) {
      const existing = new Set(groups.map((g: { id: string }) => g.id));
      const missing = ids.filter((id) => !existing.has(id));
      throw new NotFoundException(
        `ActionPathRegistryGroup not found: ${missing.slice(0, 5).join(", ")}`,
      );
    }

    // Normalize order to 0..n-1 based on provided order.
    const sorted = input
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    try {
      await this.prisma.$transaction(
        sorted.map((g, idx) =>
          (this.prisma as any).actionPathRegistryGroup.update({
            where: { id: g.id },
            data: { order: idx },
          }),
        ),
      );
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (
        msg.includes("ActionPathRegistryGroup.order") &&
        msg.includes("does not exist")
      ) {
        throw new BadRequestException(
          "ActionPathRegistryGroup.order column is missing. Apply Prisma migration before updating group order.",
        );
      }
      throw e;
    }

    return true;
  }

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
        orderBy: [
          { groupId: "asc" },
          { position: "asc" },
          { updatedAt: "desc" },
        ],
        take: limit,
        skip: offset,
        include: {
          tag: true,
          group: true,
        },
      }),
      this.prisma.actionPathRegistry.count({ where }),
    ]);

    return {
      items,
      total,
    };
  }

  async getRegistryByActionPath(actionPath: string) {
    const trimmed = actionPath?.trim();
    if (!trimmed) {
      throw new BadRequestException("actionPath is required");
    }

    return this.prisma.actionPathRegistry.findUnique({
      where: { actionPath: trimmed },
      include: {
        tag: true,
        group: true,
      },
    });
  }

  async updateActionPathRegistriesOrder(
    input: Array<{ id: string; groupId?: string | null; position: number }>,
  ) {
    if (!Array.isArray(input) || input.length === 0) {
      throw new BadRequestException("input is required");
    }

    const ids = input.map((x) => x.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException("Duplicate ids in input");
    }

    // Validate registries exist
    const registries = await this.prisma.actionPathRegistry.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (registries.length !== ids.length) {
      const existing = new Set(registries.map((r) => r.id));
      const missing = ids.filter((id) => !existing.has(id));
      throw new NotFoundException(
        `ActionPathRegistry not found: ${missing.slice(0, 5).join(", ")}`,
      );
    }

    // Validate groups exist (if provided)
    const groupIds = Array.from(
      new Set(
        input
          .map((x) => x.groupId)
          .filter((x): x is string => typeof x === "string" && x.length > 0),
      ),
    );
    if (groupIds.length > 0) {
      const groups = await (
        this.prisma as any
      ).actionPathRegistryGroup.findMany({
        where: { id: { in: groupIds } },
        select: { id: true },
      });
      if (groups.length !== groupIds.length) {
        const existing = new Set(groups.map((g: { id: string }) => g.id));
        const missing = groupIds.filter((id) => !existing.has(id));
        throw new NotFoundException(
          `ActionPathRegistryGroup not found: ${missing.slice(0, 5).join(", ")}`,
        );
      }
    }

    // Normalize positions per group to avoid gaps/duplicates.
    // For each groupId (including null), sort by provided position then assign 0..n-1.
    const byGroup = new Map<
      string,
      Array<{ id: string; groupId: string | null }>
    >();
    for (const item of input) {
      const key = item.groupId ?? "__null__";
      const arr = byGroup.get(key) ?? [];
      arr.push({ id: item.id, groupId: item.groupId ?? null });
      byGroup.set(key, arr);
    }

    // Keep deterministic ordering by sorting with provided position.
    const positionById = new Map(input.map((x) => [x.id, x.position] as const));

    const updates: Array<{
      id: string;
      groupId: string | null;
      position: number;
    }> = [];
    for (const [key, items] of byGroup.entries()) {
      items.sort((a, b) => {
        const pa = positionById.get(a.id) ?? 0;
        const pb = positionById.get(b.id) ?? 0;
        return pa - pb;
      });

      for (let i = 0; i < items.length; i += 1) {
        updates.push({
          id: items[i].id,
          groupId: items[i].groupId,
          position: i,
        });
      }
    }

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.actionPathRegistry.update({
          where: { id: u.id },
          data: {
            groupId: u.groupId,
            position: u.position,
          },
        }),
      ),
    );

    return true;
  }

  async upsertRegistry(params: {
    actionPath: string;
    description?: string;
    targetType: string;
    mappingJson: string;
    conditionsJson?: string;
    autoTagRulesJson?: string;
    schemaJson?: string;
    tagId?: string | null;
  }) {
    const mapping = parseMapping(params.mappingJson);

    const conditions = params.conditionsJson
      ? (parseConditions(
          params.conditionsJson,
        ) as unknown as Prisma.InputJsonValue)
      : undefined;

    const schema = params.schemaJson
      ? (parseSchemaJson(params.schemaJson) as unknown as Prisma.InputJsonValue)
      : undefined;

    const autoTagRules = params.autoTagRulesJson
      ? (parseAutoTagRulesJson(
          params.autoTagRulesJson,
        ) as unknown as Prisma.InputJsonValue)
      : undefined;

    await (this.prisma.actionPathRegistry as any).upsert({
      where: { actionPath: params.actionPath },
      create: {
        actionPath: params.actionPath,
        description: params.description ?? "",
        targetType: params.targetType,
        mapping: mapping as unknown as Prisma.InputJsonValue,
        conditions,
        autoTagRules,
        schema,
        tagId: params.tagId ?? undefined,
      },
      update: {
        description: params.description ?? undefined,
        targetType: params.targetType,
        mapping: mapping as unknown as Prisma.InputJsonValue,
        conditions,
        autoTagRules,
        schema,
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

    const registry = await this.prisma.actionPathRegistry.findUnique({
      where: { actionPath: params.actionPath },
    });

    if (registry && registry.targetType !== "Plant") {
      throw new BadRequestException(
        `Registry targetType mismatch for actionPath=${params.actionPath}`,
      );
    }

    validatePayloadAgainstSchema({
      payload,
      schema: (registry as unknown as { schema?: unknown } | null)?.schema,
      actionPath: params.actionPath,
    });

    const createdEvent = (await this.prisma.event.create({
      data: {
        actionPath: params.actionPath,
        targetType: "Plant",
        targetId: params.plantId,
        payload: payload as unknown as Prisma.InputJsonValue,
        registryVersion: registry ? this.buildRegistryVersion(registry) : null,
        registrySnapshot: registry
          ? ({
              mapping: registry.mapping,
              schema: registry.schema ?? null,
              targetType: registry.targetType,
              actionPath: registry.actionPath,
            } as unknown as Prisma.InputJsonValue)
          : null,
        payloadSchemaVersion: this.extractPayloadSchemaVersion(
          (registry as unknown as { schema?: unknown } | null)?.schema,
        ),
        handlerVersion: PlantProjectorService.HANDLER_VERSION,
        isSystem: params.isSystem ?? false,
      } as any,
    })) as unknown as RuntimeEvent;

    const plant = await this.prisma.plant.findUnique({
      where: { id: params.plantId },
    });
    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    if (this.syncProjectorEnabled || this.projectionOnlyMode) {
      await this.plantProjector.projectEventToPlantCurrent(createdEvent);
    }

    const updatedPlant = await this.prisma.plant.findUnique({
      where: { id: params.plantId },
    });
    return updatedPlant ?? plant;
  }

  async createLocationEvent(params: {
    locationId: string;
    actionPath: string;
    payloadJson: string;
    isSystem?: boolean;
  }) {
    const payload = parseJsonObject(
      params.payloadJson,
      "Invalid payloadJson: expected JSON object",
    );

    const registry = await this.prisma.actionPathRegistry.findUnique({
      where: { actionPath: params.actionPath },
    });

    if (registry && registry.targetType !== "Location") {
      throw new BadRequestException(
        `Registry targetType mismatch for actionPath=${params.actionPath}`,
      );
    }

    validatePayloadAgainstSchema({
      payload,
      schema: (registry as unknown as { schema?: unknown } | null)?.schema,
      actionPath: params.actionPath,
    });

    const createdEvent = (await this.prisma.event.create({
      data: {
        actionPath: params.actionPath,
        targetType: "Location",
        targetId: params.locationId,
        payload: payload as unknown as Prisma.InputJsonValue,
        registryVersion: registry ? this.buildRegistryVersion(registry) : null,
        registrySnapshot: registry
          ? ({
              mapping: registry.mapping,
              schema: registry.schema ?? null,
              targetType: registry.targetType,
              actionPath: registry.actionPath,
            } as unknown as Prisma.InputJsonValue)
          : null,
        payloadSchemaVersion: this.extractPayloadSchemaVersion(
          (registry as unknown as { schema?: unknown } | null)?.schema,
        ),
        handlerVersion: LocationProjectorService.HANDLER_VERSION,
        isSystem: params.isSystem ?? false,
      } as any,
    })) as unknown as RuntimeEvent;

    const location = await this.prisma.location.findUnique({
      where: { id: params.locationId },
    });
    if (!location) {
      throw new NotFoundException("Location not found");
    }

    if (this.syncProjectorEnabled || this.projectionOnlyMode) {
      await this.locationProjector.projectEventToLocationCurrent(createdEvent);
    }

    const updatedLocation = await this.prisma.location.findUnique({
      where: { id: params.locationId },
    });
    return updatedLocation ?? location;
  }

  private buildRegistryVersion(registry: {
    id: string;
    updatedAt: Date;
  }): string {
    return `${registry.id}:${registry.updatedAt.toISOString()}`;
  }

  private extractPayloadSchemaVersion(schema: unknown): string | null {
    if (!isPlainObject(schema)) {
      return null;
    }
    const version = schema.version;
    return typeof version === "string" && version.trim() ? version : "v1";
  }

  async replayPlantStateAt(plantId: string, asOf: Date): Promise<JsonObject> {
    const snapshot = await (this.prisma as any).plantSnapshot.findFirst({
      where: {
        plantId,
        asOfTimestamp: { lte: asOf },
      },
      orderBy: { asOfTimestamp: "desc" },
    });

    const initialState = ((snapshot?.state as JsonObject | undefined) ??
      {}) as JsonObject;
    const where: Prisma.EventWhereInput = {
      targetType: "Plant",
      targetId: plantId,
      timestamp: { lte: asOf },
      ...(snapshot
        ? { timestamp: { gt: snapshot.asOfTimestamp, lte: asOf } }
        : {}),
    };

    const events = (await this.prisma.event.findMany({
      where,
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    })) as unknown as RuntimeEvent[];

    let state = initialState;
    for (const event of events) {
      state = this.plantProjector.applyEventToState(state, event);
    }
    return state;
  }

  async createPlantSnapshot(params: {
    plantId: string;
    asOf?: Date;
  }): Promise<boolean> {
    const asOf = params.asOf ?? new Date();
    const state = await this.replayPlantStateAt(params.plantId, asOf);
    const latestEvent = await this.prisma.event.findFirst({
      where: {
        targetType: "Plant",
        targetId: params.plantId,
        timestamp: { lte: asOf },
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    });

    await (this.prisma as any).plantSnapshot.create({
      data: {
        plantId: params.plantId,
        asOfEventId: latestEvent?.id ?? null,
        asOfTimestamp: asOf,
        projectorVersion: PlantProjectorService.PROJECTOR_VERSION,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });

    return true;
  }

  async rebuildPlantProjection(params: { plantId: string; asOf?: Date }) {
    const asOf = params.asOf ?? new Date();
    const state = await this.replayPlantStateAt(params.plantId, asOf);
    return this.prisma.plant.update({
      where: { id: params.plantId },
      data: { current: state as unknown as Prisma.InputJsonValue },
    });
  }

  async replayLocationStateAt(
    locationId: string,
    asOf: Date,
  ): Promise<JsonObject> {
    const snapshot = await (this.prisma as any).locationSnapshot.findFirst({
      where: {
        locationId,
        asOfTimestamp: { lte: asOf },
      },
      orderBy: { asOfTimestamp: "desc" },
    });

    const initialState = ((snapshot?.state as JsonObject | undefined) ??
      {}) as JsonObject;
    const where: Prisma.EventWhereInput = {
      targetType: "Location",
      targetId: locationId,
      timestamp: { lte: asOf },
      ...(snapshot
        ? { timestamp: { gt: snapshot.asOfTimestamp, lte: asOf } }
        : {}),
    };

    const events = (await this.prisma.event.findMany({
      where,
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    })) as unknown as RuntimeEvent[];

    let state = initialState;
    for (const event of events) {
      state = this.locationProjector.applyEventToState(state, event);
    }
    return state;
  }

  async createLocationSnapshot(params: {
    locationId: string;
    asOf?: Date;
  }): Promise<boolean> {
    const asOf = params.asOf ?? new Date();
    const state = await this.replayLocationStateAt(params.locationId, asOf);
    const latestEvent = await this.prisma.event.findFirst({
      where: {
        targetType: "Location",
        targetId: params.locationId,
        timestamp: { lte: asOf },
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    });

    await (this.prisma as any).locationSnapshot.create({
      data: {
        locationId: params.locationId,
        asOfEventId: latestEvent?.id ?? null,
        asOfTimestamp: asOf,
        projectorVersion: LocationProjectorService.PROJECTOR_VERSION,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });

    return true;
  }

  async rebuildLocationProjection(params: { locationId: string; asOf?: Date }) {
    const asOf = params.asOf ?? new Date();
    const state = await this.replayLocationStateAt(params.locationId, asOf);
    return this.prisma.location.update({
      where: { id: params.locationId },
      data: { current: state as unknown as Prisma.InputJsonValue },
    });
  }
}
