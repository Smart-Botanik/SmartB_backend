# Taxonomy module boundary (BK-MS-TAX-1)

**ADR:** [ADR-0009](../../../memory/docs/adr/0009-domain-microservices-extraction-v1.md) Phase 0  
**Module:** `src/modules/taxonomy/`

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `TaxonomyScope`, `TaxonomyTag` | **taxonomy-service** only (monolith: remote) |
| Business rules (namespace, forest, deleteGroup) | `TaxonomyTagService` |
| GraphQL queries/mutations `taxonomy*` | `TaxonomyTagResolver` |
| Nest wiring | `TaxonomyModule` |

## Public API (for other modules)

Import **`TaxonomyTagService`** from `@/modules/taxonomy` (or relative path).  
Do **not** import `TaxonomyRepository` outside taxonomy module except scripts/tests.

| Method | Use case |
|--------|----------|
| `connectByIds(ids, ctx?)` | M2M link Product / CropGuide → tags |
| `connectByKeys(keys)` | Seed / migration by stable keys (remote: one `taxonomyTagsByKeys` call) |
| `tagsByKeys(keys)` | Batch lookup by stable keys (GraphQL + internal) |
| `list`, `forest`, `getById`, … | Prefer GraphQL for admin; service for internal |

## Forbidden in other modules

- `prisma.taxonomyScope.*` / `prisma.taxonomyTag.*` in `ContentService`, `ProductsService`, resolvers outside taxonomy.
- Duplicating validation from `@growing/contracts` `validateTaxonomyTagSelection`.

**Allowed:** `prisma.cropGuide.update({ taxonomyTags: { connect } })` using IDs returned from `TaxonomyTagService.connectByIds`.

## Exceptions

| Path | Reason |
|------|--------|
| `src/scripts/seed-taxonomy-tags.ts` | Idempotent seed; may use Prisma upsert directly until migrated to service |
| `prisma/seed.ts` | Orchestration |

## GraphQL surface (unchanged for clients)

- Queries: `taxonomyScopes`, `taxonomyTags`, `taxonomyForest`, `taxonomyTag`, `taxonomyTagsByKeys`
- Mutations: `createTaxonomyScope`, `createTaxonomyTag`, `updateTaxonomyTag`, `deleteTaxonomyTag`, `deleteTaxonomyGroup`

## Smoke

```bash
npm run test:taxonomy:e2e
```

Requires database with seed or runs `seedTaxonomyTags` inline.

## Phase 1 proxy (BK-MS-TAX-2 spike)

When **`TAXONOMY_SERVICE_URL`** is set, monolith uses **`TaxonomyTagRemoteService`** (GraphQL over HTTP) instead of local Prisma. Clients keep **`/graphql`** on monolith.

| Env | Purpose |
|-----|---------|
| `TAXONOMY_SERVICE_URL` | e.g. `http://localhost:3010` |
| `TAXONOMY_SERVICE_INTERNAL_KEY` | Header `X-Taxonomy-Internal-Key` for service-to-service |
| `TAXONOMY_DATABASE_URL` | Target DB for `npm run db:export-taxonomy` |

Standalone service: [`../../services/taxonomy/README.md`](../../services/taxonomy/README.md).  
Research: [`../../memory/backend/research-taxonomy-service-extract-v1.md`](../../memory/backend/research-taxonomy-service-extract-v1.md).

## Cutover (BK-MS-TAX-3) ✅

Monolith: no `TaxonomyScope`/`TaxonomyTag`; `CropGuideTaxonomyTag` stores tag ids; `TaxonomyTagService` remote-only.  
Runbook: [`../../memory/backend/research-taxonomy-cutover-v1.md`](../../memory/backend/research-taxonomy-cutover-v1.md).
