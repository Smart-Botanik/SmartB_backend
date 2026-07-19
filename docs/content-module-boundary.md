# Content module boundary (BK-MS-CONTENT)

**ADR:** [ADR-0016](../../../memory/docs/adr/0016-content-service-extract-v1.md)  
**Modules:** `src/modules/content/`, `src/modules/telegram/`  
**Target service:** `content-service` (`services/content/`)

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `CropGuide`, `SitePage`, `CropGuideTaxonomyTag` | **content-service** (after cutover) |
| Prisma `TelegramBot`, `TelegramChannel`, `CropGuideTelegramPublication` | **content-service** |
| Guide/SitePage CRUD + publish | `ContentService` |
| Telegram send / bot CRUD | `Telegram*` services |
| GraphQL content + telegram ops | Resolvers in content / telegram modules |
| Media bytes / `Media` table | **monolith** — opaque `coverMediaId` |
| Taxonomy tag rows | **taxonomy-service** — opaque `taxonomyTagId` |
| Content facets | **ContentFacetsModule** — out of scope |

## Public API (for other modules)

Import **`ContentService`** / Telegram publish services from module barrels.  
Do **not** use `prisma.cropGuide` / `prisma.telegram*` outside content/telegram (after cutover — remote only).

## Cross-domain rules

| Dependency | Allowed |
|------------|---------|
| **Taxonomy** | `TaxonomyTagService` / remote `TaxonomyLinkClient` — no local taxonomy Prisma |
| **Media** | Existence check optional in service spike; **resolve URL** only in BFF |
| **Facets** | No coupling |

## Forbidden

- `prisma.media` inside content-service for cover FK (store id only).
- Duplicating Bot API send outside Telegram module of content-service after cutover.

## GraphQL surface (unchanged for clients)

**Queries:** `cropGuides`, `cropGuide`, `publishedCropGuides`, `publishedCropGuide`, `sitePage`, `publishedSitePage`, `telegramBots`, `telegramChannels`, `cropGuideTelegramPublications`, …  
**Mutations:** `createCropGuide`, `publishCropGuide`, `publishCropGuideToTelegram`, bot/channel CRUD, …

## Proxy / cutover

| Env | Purpose |
|-----|---------|
| `CONTENT_SERVICE_URL` | e.g. `http://localhost:3012` |
| `CONTENT_SERVICE_INTERNAL_KEY` | Header `X-Content-Internal-Key` |
| `CONTENT_CUTOVER` | `true` → remote required |
| `CONTENT_DATABASE_URL` | Target for `npm run db:export-content` |

Standalone: [`../../services/content/README.md`](../../services/content/README.md).  
Research: [`../../memory/docs/research/backend/research-content-service-extract-v1.md`](../../memory/docs/research/backend/research-content-service-extract-v1.md).

## Cutover (BK-MS-CONTENT-4) ✅ 2026-07-10

- Monolith: **no** `CropGuide` / `SitePage` / `Telegram*` Prisma models; `CONTENT_SERVICE_URL` required.
- `coverMediaId` — opaque; GraphQL `cover` via BFF Media stitch.
- Migration: `20260710010000_content_service_cutover`.
- Service: [`../../services/content/README.md`](../../services/content/README.md).