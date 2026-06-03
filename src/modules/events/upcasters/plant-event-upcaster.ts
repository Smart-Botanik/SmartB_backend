type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Legacy `sizes.*` → `bed.*` (габариты места на грядке). */
function nestLegacyBedSizes(payload: JsonObject): JsonObject {
  const sizes = payload.sizes;
  if (!isPlainObject(sizes)) {
    return payload;
  }

  const width = sizes.width;
  const height = sizes.height;
  if (width === undefined && height === undefined) {
    return payload;
  }

  const next: JsonObject = { ...payload };
  delete next.sizes;

  const bed: JsonObject = isPlainObject(next.bed) ? { ...(next.bed as JsonObject) } : {};
  if (width !== undefined && bed.width === undefined) {
    bed.width = width;
  }
  if (height !== undefined && bed.height === undefined) {
    bed.height = height;
  }
  if (Object.keys(bed).length > 0) {
    next.bed = bed;
  }

  return next;
}

/** Flat potType/potSize (legacy plant.created) → nested `pot`. */
function nestLegacyPotFields(payload: JsonObject): JsonObject {
  const potType = payload.potType;
  const potSize = payload.potSize;
  if (potType === undefined && potSize === undefined) {
    return payload;
  }

  const next: JsonObject = { ...payload };
  delete next.potType;
  delete next.potSize;

  const pot: JsonObject = isPlainObject(next.pot) ? { ...(next.pot as JsonObject) } : {};
  if (potType !== undefined && pot.type === undefined) {
    pot.type = potType;
  }
  if (potSize !== undefined && pot.size === undefined) {
    pot.size = potSize;
  }
  if (Object.keys(pot).length > 0) {
    next.pot = pot;
  }

  return next;
}

export function upcastPlantEventPayload(params: {
  payload: JsonObject;
  payloadSchemaVersion?: string | null;
}): JsonObject {
  const version = params.payloadSchemaVersion ?? "v1";

  const normalized = nestLegacyBedSizes(nestLegacyPotFields(params.payload));

  if (version === "v1") {
    return normalized;
  }

  return normalized;
}
