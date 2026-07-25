const AI_GENERATION_FIELDS = `
  id kind status targetDate inputJson factsJson promptVersion
  output { title bodyMd suggestedGeneralState }
  model errorMessage appliedAt appliedTargetRef createdAt updatedAt
`;

export const QUERY_LUNAR_FACTS = `
  query LunarFacts($date: String!, $timezone: String) {
    lunarFacts(date: $date, timezone: $timezone) {
      date moonPhase moonZodiacSign illumination eclipticLongitude phaseAngle timezone
    }
  }
`;

export const QUERY_AI_GENERATION = `
  query AiGeneration($id: ID!) {
    aiGeneration(id: $id) { ${AI_GENERATION_FIELDS} }
  }
`;

export const QUERY_AI_GENERATIONS = `
  query AiGenerations(
    $kind: AiGenerationKind
    $targetDate: String
    $status: AiGenerationStatus
    $limit: Int
    $offset: Int
  ) {
    aiGenerations(
      kind: $kind
      targetDate: $targetDate
      status: $status
      limit: $limit
      offset: $offset
    ) { ${AI_GENERATION_FIELDS} }
  }
`;

export const MUTATION_GENERATE_LUNAR_DAY = `
  mutation GenerateLunarCalendarDayContent($input: GenerateLunarCalendarDayInput!) {
    generateLunarCalendarDayContent(input: $input) { ${AI_GENERATION_FIELDS} }
  }
`;

export const MUTATION_GENERATE_LUNAR_DAY_BATCH = `
  mutation GenerateLunarCalendarDayContentBatch($input: GenerateLunarCalendarDayBatchInput!) {
    generateLunarCalendarDayContentBatch(input: $input) {
      generated { ${AI_GENERATION_FIELDS} }
      skipped
      failed
    }
  }
`;

export const MUTATION_DISCARD_AI_GENERATION = `
  mutation DiscardAiGeneration($id: ID!) {
    discardAiGeneration(id: $id) { ${AI_GENERATION_FIELDS} }
  }
`;

export const MUTATION_MARK_AI_GENERATION_APPLIED = `
  mutation MarkAiGenerationApplied($id: ID!, $appliedTargetRef: String!) {
    markAiGenerationApplied(id: $id, appliedTargetRef: $appliedTargetRef) {
      ${AI_GENERATION_FIELDS}
    }
  }
`;
