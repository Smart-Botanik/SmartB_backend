import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { ContentService } from "../content/content.service";
import { AiRemoteGraphqlClient } from "./ai-remote.graphql-client";
import {
  MUTATION_DISCARD_AI_GENERATION,
  MUTATION_GENERATE_LUNAR_DAY,
  MUTATION_GENERATE_LUNAR_DAY_BATCH,
  MUTATION_MARK_AI_GENERATION_APPLIED,
  QUERY_AI_GENERATION,
  QUERY_AI_GENERATIONS,
  QUERY_LUNAR_FACTS,
} from "./ai-remote.operations";

type AiGenerationRemote = {
  id: string;
  kind: string;
  status: string;
  targetDate?: string | null;
  output?: {
    title?: string | null;
    bodyMd?: string | null;
    suggestedGeneralState?: string | null;
  } | null;
  factsJson?: {
    moonPhase?: string;
    moonZodiacSign?: string;
  } | null;
};

@Injectable()
export class AiRemoteService {
  constructor(
    private readonly remote: AiRemoteGraphqlClient,
    private readonly contentService: ContentService,
  ) {}

  lunarFacts(date: string, timezone?: string | null) {
    return this.remote
      .execute<{ lunarFacts: unknown }>(QUERY_LUNAR_FACTS, {
        date,
        timezone: timezone ?? undefined,
      })
      .then(data => data.lunarFacts);
  }

  aiGeneration(id: string) {
    return this.remote
      .execute<{ aiGeneration: unknown | null }>(QUERY_AI_GENERATION, { id })
      .then(data => data.aiGeneration);
  }

  aiGenerations(params: {
    kind?: string | null;
    targetDate?: string | null;
    status?: string | null;
    limit?: number | null;
    offset?: number | null;
  }) {
    return this.remote
      .execute<{ aiGenerations: unknown[] }>(QUERY_AI_GENERATIONS, {
        kind: params.kind ?? undefined,
        targetDate: params.targetDate ?? undefined,
        status: params.status ?? undefined,
        limit: params.limit ?? undefined,
        offset: params.offset ?? undefined,
      })
      .then(data => data.aiGenerations);
  }

  generateLunarCalendarDayContent(input: {
    date: string;
    timezone?: string | null;
    notes?: string | null;
    locale?: string | null;
  }) {
    return this.remote
      .execute<{ generateLunarCalendarDayContent: unknown }>(
        MUTATION_GENERATE_LUNAR_DAY,
        { input },
      )
      .then(data => data.generateLunarCalendarDayContent);
  }

  generateLunarCalendarDayContentBatch(input: {
    from: string;
    to: string;
    timezone?: string | null;
    notes?: string | null;
    locale?: string | null;
    limit?: number | null;
  }) {
    return this.remote
      .execute<{ generateLunarCalendarDayContentBatch: unknown }>(
        MUTATION_GENERATE_LUNAR_DAY_BATCH,
        { input },
      )
      .then(data => data.generateLunarCalendarDayContentBatch);
  }

  discardAiGeneration(id: string) {
    return this.remote
      .execute<{ discardAiGeneration: unknown }>(MUTATION_DISCARD_AI_GENERATION, {
        id,
      })
      .then(data => data.discardAiGeneration);
  }

  async applyAiGenerationToCalendarDay(input: {
    generationId: string;
    asDraft?: boolean | null;
  }) {
    const generation = (await this.aiGeneration(
      input.generationId,
    )) as AiGenerationRemote | null;
    if (!generation) {
      throw new NotFoundException("AiGeneration not found");
    }
    if (generation.status !== "SUCCEEDED" && generation.status !== "APPLIED") {
      throw new BadRequestException(
        `Generation status must be SUCCEEDED (got ${generation.status})`,
      );
    }
    if (!generation.targetDate) {
      throw new BadRequestException("Generation has no targetDate");
    }

    const facts =
      generation.factsJson && typeof generation.factsJson === "object"
        ? generation.factsJson
        : {};
    const output = generation.output ?? {};
    const day = await this.contentService.upsertCalendarDay({
      date: generation.targetDate,
      title: output.title ?? null,
      bodyMd: output.bodyMd ?? "",
      moonPhase: facts.moonPhase ?? null,
      moonZodiacSign: facts.moonZodiacSign ?? null,
      generalState: output.suggestedGeneralState ?? "NEUTRAL",
      status: input.asDraft === false ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
    });

    await this.remote.execute(MUTATION_MARK_AI_GENERATION_APPLIED, {
      id: generation.id,
      appliedTargetRef: `content:CalendarDay:${generation.targetDate}`,
    });

    return day;
  }

  async runLunarCalendarBackfill(input: {
    from: string;
    to: string;
    timezone?: string | null;
    notes?: string | null;
    locale?: string | null;
    skipExisting?: boolean | null;
    autoApply?: boolean | null;
    limit?: number | null;
    dryRun?: boolean | null;
  }) {
    const dryRun = Boolean(input.dryRun);
    const max = Math.min(Math.max(input.limit ?? 31, 1), 90);
    const dates = eachDateInclusive(input.from, input.to).slice(0, max);
    let processed = 0;
    let generated = 0;
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    const generationIds: string[] = [];

    for (const date of dates) {
      processed += 1;
      if (input.skipExisting !== false) {
        const existing = await this.contentService.getCalendarDay(date);
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      if (dryRun) {
        generated += 1;
        continue;
      }

      const row = (await this.generateLunarCalendarDayContent({
        date,
        timezone: input.timezone,
        notes: input.notes,
        locale: input.locale,
      })) as AiGenerationRemote;

      if (row.status === "FAILED") {
        failed += 1;
        continue;
      }
      generated += 1;
      generationIds.push(row.id);

      if (input.autoApply) {
        await this.applyAiGenerationToCalendarDay({
          generationId: row.id,
          asDraft: true,
        });
        applied += 1;
      }
    }

    const total = eachDateInclusive(input.from, input.to).length;
    return {
      processed,
      generated,
      applied,
      skipped: skipped + Math.max(0, total - dates.length),
      failed,
      generationIds,
      dryRun,
    };
  }
}

function eachDateInclusive(from: string, to: string): string[] {
  const start = parseUtc(from);
  const end = parseUtc(to);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatUtc(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function parseUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
