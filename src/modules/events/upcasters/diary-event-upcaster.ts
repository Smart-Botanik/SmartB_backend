type JsonObject = Record<string, unknown>;

export function upcastDiaryEventPayload(params: {
  payload: JsonObject;
  payloadSchemaVersion?: string | null;
}): JsonObject {
  const version = params.payloadSchemaVersion ?? "v1";

  if (version === "v1") {
    return params.payload;
  }

  return params.payload;
}
