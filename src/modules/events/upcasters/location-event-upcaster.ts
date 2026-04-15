type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Location payload compatibility chain.
 * v1 keeps payload as-is, with alias migration:
 * occupancy.notes -> occupancy.description
 */
export function upcastLocationEventPayload(params: {
  payload: JsonObject;
  payloadSchemaVersion?: string | null;
}): JsonObject {
  const version = params.payloadSchemaVersion ?? "v1";
  const payload = params.payload;

  if (version === "v1" && isPlainObject(payload.occupancy)) {
    const occupancy = { ...(payload.occupancy as JsonObject) };
    if (
      typeof occupancy.description !== "string" &&
      typeof occupancy.notes === "string"
    ) {
      occupancy.description = occupancy.notes;
    }
    return {
      ...payload,
      occupancy,
    };
  }

  return payload;
}
