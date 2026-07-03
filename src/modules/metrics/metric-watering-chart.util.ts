import { getValueAtPayloadPath } from "@growing/contracts";

export const METRIC_WATERING_CHART_PROFILE_KEY = "watering.chart.v1";
export const METRIC_WATERING_CHART_ACTION_PATH = "plant.growth.watering";

export type MetricTimeseriesPointDto = {
  timestamp: Date;
  plantId: string;
  eventId: string;
  value: number;
  unit: string | null;
};

export type MetricTimeseriesSeriesDto = {
  fieldId: string;
  label: string;
  semanticKind: string | null;
  unit: string | null;
  points: MetricTimeseriesPointDto[];
};

export type MetricWateringChartDto = {
  profileKey: string;
  actionPath: string;
  series: MetricTimeseriesSeriesDto[];
};

type ChartFieldSpec = {
  fieldId: string;
  label: string;
  semanticKind: string | null;
  unit: string | null;
  canonicalPath: string;
};

export function extractNumericFromEventPayload(
  payload: unknown,
  canonicalPath: string,
): { value: number; unit?: string } | null {
  const candidates = [
    `${canonicalPath}.value`,
    canonicalPath,
    `watering.${canonicalPath}.value`,
    `watering.${canonicalPath}`,
  ];

  for (const path of candidates) {
    const raw = getValueAtPayloadPath(payload, path);
    if (typeof raw === "number" && Number.isFinite(raw)) {
      const unitPath = path.endsWith(".value")
        ? path.replace(/\.value$/, ".unit")
        : `${path}.unit`;
      const unit = getValueAtPayloadPath(payload, unitPath);
      return { value: raw, unit: typeof unit === "string" ? unit : undefined };
    }

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.value === "number" && Number.isFinite(obj.value)) {
        return {
          value: obj.value,
          unit: typeof obj.unit === "string" ? obj.unit : undefined,
        };
      }
    }
  }

  return null;
}

export function buildWateringChartFromEvents(params: {
  fields: ChartFieldSpec[];
  events: Array<{ id: string; targetId: string; payload: unknown; timestamp: Date }>;
}): MetricWateringChartDto {
  const seriesByFieldId = new Map<string, MetricTimeseriesSeriesDto>();

  for (const field of params.fields) {
    seriesByFieldId.set(field.fieldId, {
      fieldId: field.fieldId,
      label: field.label,
      semanticKind: field.semanticKind,
      unit: field.unit,
      points: [],
    });
  }

  for (const event of params.events) {
    for (const field of params.fields) {
      const extracted = extractNumericFromEventPayload(event.payload, field.canonicalPath);
      if (!extracted) {
        continue;
      }

      const series = seriesByFieldId.get(field.fieldId);
      if (!series) {
        continue;
      }

      series.points.push({
        timestamp: event.timestamp,
        plantId: event.targetId,
        eventId: event.id,
        value: extracted.value,
        unit: extracted.unit ?? field.unit,
      });
    }
  }

  for (const series of seriesByFieldId.values()) {
    series.points.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime() || a.eventId.localeCompare(b.eventId),
    );
  }

  return {
    profileKey: METRIC_WATERING_CHART_PROFILE_KEY,
    actionPath: METRIC_WATERING_CHART_ACTION_PATH,
    series: [...seriesByFieldId.values()],
  };
}
