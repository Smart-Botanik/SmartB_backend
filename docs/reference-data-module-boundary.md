# Reference Data module boundary (BK-MS-REFDATA-1)

**ADR:** [ADR-0009](../../../memory/docs/adr/0009-domain-microservices-extraction-v1.md) Phase 0  
**Target service:** `reference-data-service` (Phase 2)  
**Module:** `src/modules/reference-data/`

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `Brand`, `Product` | `ReferenceDataRepository` only |
| Brand CRUD + category parsing | `BrandsService` |
| Product CRUD + brand FK | `ProductsService` |
| Product ↔ TaxonomyTag M2M | `ProductsService` via **`TaxonomyTagService.connectByIds`** |
| GraphQL `brands*` / `products*` | `BrandsResolver`, `ProductsResolver` |
| Nest wiring | `ReferenceDataModule` |

## Public API (for other modules)

Import **`BrandsService`** or **`ProductsService`** from `@/modules/reference-data` (or relative path).  
Do **not** import `ReferenceDataRepository` outside reference-data except scripts/tests.

| Method | Use case |
|--------|----------|
| `BrandsService.getById` / `list` | Admin / catalog |
| `ProductsService.getById` / `list` | Admin, Locations enclosure `productId` validation |
| `ProductsService.create/update` | Admin; taxonomy via `taxonomyTagIds` |

## Cross-domain rules

| Dependency | Allowed |
|------------|---------|
| **Taxonomy** | `TaxonomyTagService.connectByIds` / `connectByKeys` only — no `prisma.taxonomyTag` here |
| **Media** | `findMediaById` in repository for `avatarMediaId` existence check (ID only) |
| **Locations / Diary / Plant** | `ProductsService.getById` for FK checks — no `prisma.product` |

## Forbidden in other modules

- `prisma.brand.*` / `prisma.product.*` anywhere in monolith (**BK-MS-REFDATA-3** — tables dropped).

## Exceptions

| Path | Reason |
|------|--------|
| `src/scripts/export-reference-data-db.ts` | One-time migration from legacy monolith DB |
| `services/reference-data/prisma/seed.ts` | Seed reference_data_db |

## GraphQL surface (unchanged for clients)

**Queries:** `brands`, `brand`, `products`, `product`  
**Mutations:** `createBrand`, `updateBrand`, `deleteBrand`, `createProduct`, `updateProduct`, `deleteProduct`

Contract SoT: `packages/contracts/schema/schema.graphql` · operations: `packages/contracts/operations/product.graphql` (and brand ops in schema).

## Smoke

```bash
npm run test:reference-data:e2e
```

Requires DB with seed (`npm run db:seed`).

## Phase 2 proxy (BK-MS-REFDATA-2 spike)

When **`REFERENCE_DATA_SERVICE_URL`** is set, monolith uses **`BrandsRemoteService`** / **`ProductsRemoteService`** (GraphQL over HTTP). Clients keep **`/graphql`** on monolith.

| Env | Purpose |
|-----|---------|
| `REFERENCE_DATA_SERVICE_URL` | e.g. `http://localhost:3011` |
| `REFERENCE_DATA_SERVICE_INTERNAL_KEY` | Header `X-Reference-Data-Internal-Key` |
| `REFERENCE_DATA_DATABASE_URL` | Target DB for `npm run db:export-reference-data` |

Standalone service: [`../../services/reference-data/README.md`](../../services/reference-data/README.md).  
Research: [`../../memory/backend/research-reference-data-service-extract-v1.md`](../../memory/backend/research-reference-data-service-extract-v1.md).

**Spike limits:** reference-data-service returns `avatar: null`; taxonomy tags hydrated via `TAXONOMY_SERVICE_URL` on product reads/writes.

## Cutover (BK-MS-REFDATA-3) ✅

- Monolith: **no** `Brand` / `Product` Prisma models; `REFERENCE_DATA_SERVICE_URL` required.
- `LocationSpecsEnclosure.productId` — opaque id; GraphQL `product` via `LocationSpecsEnclosureResolver`.
- Runbook: [`../../memory/backend/research-reference-data-cutover-v1.md`](../../memory/backend/research-reference-data-cutover-v1.md).
