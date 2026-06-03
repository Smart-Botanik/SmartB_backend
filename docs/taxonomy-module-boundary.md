# Taxonomy module boundary (BK-MS-TAX-1)

**ADR:** [ADR-0009](../../../memory/docs/adr/0009-domain-microservices-extraction-v1.md) Phase 0  
**Module:** `src/modules/taxonomy/`

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `TaxonomyScope`, `TaxonomyTag` | `TaxonomyRepository` only |
| Business rules (namespace, forest, deleteGroup) | `TaxonomyTagService` |
| GraphQL queries/mutations `taxonomy*` | `TaxonomyTagResolver` |
| Nest wiring | `TaxonomyModule` |

## Public API (for other modules)

Import **`TaxonomyTagService`** from `@/modules/taxonomy` (or relative path).  
Do **not** import `TaxonomyRepository` outside taxonomy module except scripts/tests.

| Method | Use case |
|--------|----------|
| `connectByIds(ids, ctx?)` | M2M link Product / CropGuide → tags |
| `connectByKeys(keys)` | Seed / migration by stable keys |
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

- Queries: `taxonomyScopes`, `taxonomyTags`, `taxonomyForest`, `taxonomyTag`
- Mutations: `createTaxonomyScope`, `createTaxonomyTag`, `updateTaxonomyTag`, `deleteTaxonomyTag`, `deleteTaxonomyGroup`

## Smoke

```bash
npm run test:taxonomy:e2e
```

Requires database with seed or runs `seedTaxonomyTags` inline.

## Next (BK-MS-TAX-2)

Extract deployable `taxonomy-service` + separate DB; monolith proxies GraphQL or federates schema.
