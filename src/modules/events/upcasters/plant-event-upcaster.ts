  type JsonObject = Record<string, unknown>;

export function upcastPlantEventPayload(params: {
  payload: JsonObject;
  payloadSchemaVersion?: string | null;
}): JsonObject {
  const version = params.payloadSchemaVersion ?? "v1";

  // Placeholder for schema evolution chain: v1 -> v2 -> ...
  // Today we keep payload as-is to preserve backward compatibility.
  if (version === "v1") {
    return params.payload;
  }

  return params.payload;
}
