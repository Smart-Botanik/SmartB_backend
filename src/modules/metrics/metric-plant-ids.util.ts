import type { MetricPlantProjection } from "./metric-projection.util";

export function collectPlantIdsFromProjection(projection: MetricPlantProjection): string[] {
  const ids = new Set<string>();
  for (const list of [
    projection.planned,
    projection.readyToPlant,
    projection.seated,
    projection.withoutLocation,
  ]) {
    for (const ctx of list) {
      ids.add(ctx.plant.id);
    }
  }
  return [...ids];
}
