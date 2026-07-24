# Nest history (local)

> Локальный лог `backend_nest/`. **Не** копия platform `memory/project/history.md`.  
> Шаблон: date · role · change · impact · reason.

## 2026-07-24 — Culture facets starting seed + LOGO assets ([Backend])

**Role**: Backend  
**Change**: Exported live culture LOGO PNGs (8 crops incl. pumpkin) + tomato PREVIEW/IMAGE_M into `assets/content-facets/culture/*/`; updated `seed-culture-facets` (LOGO required, photoreal optional); `CULTURE_CHIP_EMOJI_SEED` + pumpkin.  
**Impact**: `npm run db:seed:culture-facets` restores production-ready culture_tag profiles with chip PNGs.  
**Reason**: Freeze current good facet starting data for future / prod bootstrap.

## 2026-07-24 — Taxonomy starting seed lives in taxonomy-service ([Backend])

**Role**: Backend  
**Change**: Live taxonomy snapshot → `services/taxonomy/prisma/seed-data/starting-taxonomy.v1.json` (4 scopes, 46 tags); `db:seed` loads it; `db:export-starting-seed` refreshes.  
**Impact**: Taxonomy env bootstraps independently of Nest (deploy-friendly).  
**Reason**: Per-service starting data ownership.

## 2026-07-23 — Social path: nest = app only ([Architect] · [Backend])

**Role**: Architect · Backend  
**Change**: ADR-0020 amended — site → social-service; removed Nest `SocialModule`; BK-ENGAGE-BFF-1 cancelled.  
**Impact**: App BFF stays free of comments; site engages social SoT directly when mocks drop.  
**Reason**: User: backend_nest is for app only; no comments there yet.

## 2026-07-23 — BK-ENGAGE-BFF-1: social GraphQL proxy ([Backend])

**Role**: Backend  
**Change**: `SocialModule` remote client → social-service :3014; public stats/comments + auth like/comment; `SOCIAL_CUTOVER`; `discussionId` in CropGuide remote fields.  
**Impact**: Site can call BFF `/graphql` for engagement; next SITE-USEFUL-3 swaps mocks.  
**Reason**: ADR-0020 cutover path.

## 2026-07-22 — BK-MS-GALLERY-1: galleries API + BFF proxy ([Backend])

**Role**: Backend  
**Change**: media-service schema `MediaGallery` / `MediaGalleryItem` / `MediaEntry` + `Media.kind`/`posterMediaId`; REST CRUD; BFF proxy routes + GraphQL `publishedGallery`; contracts `media-gallery`; site `/useful` sections + env gallery ids.  
**Impact**: ADR-0019 path live for create/publish/read hydrated galleries.  
**Reason**: Start implementing ARCH-MEDIA-TAX-1 story.

## 2026-07-22 — BK-CF-CHIP-PNG-1: LOGO PNG over emoji ([Backend])

**Role**: Backend  
**Change**: `resolveCultureChipIcon` в `@growing/contracts` — приоритет LOGO (MEDIA/PNG) над TEXT `chip_icon` emoji.  
**Impact**: `publishedCultureOptions` отдаёт `icon.kind=MEDIA` для всех культур с опубликованным LOGO, даже если seed emoji ещё в профиле.  
**Reason**: Site sidebar не показывал PNG — emoji TEXT блокировал уже залитые LOGO (кроме tomato после CE-CHIP-PNG-1).

## 2026-07-20 — BK-MS-MEDIA-2: start fix after Media drop ([Backend])

**Role**: Backend  
**Change**: Typed `MediaService`/`MediaRecord` (drop `unknown`); content-facets stitch via `MediaService` instead of removed `prisma.media`.  
**Impact**: `tsc` / `npm run dev` compile clean; Nest boots on :3001 when grow_db :5434 is up.  
**Reason**: Schema dropped Media (ADR-0018) but facets + controller still assumed local Prisma / untyped remote.

## 2026-07-20 — TS-MIG-1 follow-up: `dev` без Nest CLI ([Backend])

**Role**: Backend  
**Change**: `npm run dev` → `scripts/dev-watch.mjs` (`tsc --watch` + `node --watch`); optional `@typescript/typescript-win32-x64@7.0.2` для native `tsc` на Windows.  
**Impact**: Уходит `getParsedCommandLineOfConfigFile is not a function` при старте на TypeScript 7. `nest start` по-прежнему ломается (ожидаемо до Nest CLI / TS 7.1).  
**Reason**: ADR-0017 — Nest CLI ещё на classic Compiler API; тот же паттерн, что в `services/content-edges`.

## 2026-07-19 — BK-CF-REMOTE-1: facet profile miss ≠ 503 ([Backend])

**Role**: Backend  
**Change**: `ContentEdgesRemoteGraphqlClient` maps remote not-found → `NotFoundException`; `getProfileBySubject` returns `null` for admin empty editor. Transport/5xx still 503.  
**Impact**: Admin culture facet without row gets `contentFacetProfile: null` (no error toast from 503).  
**Reason**: CE-OUT-1 / nullable contract; seed of empty crops stays in content-edges.

## 2026-07-15 — Memory pilot: backend_nest/.memory (Architect)

**Role**: Architect  
**Change**: Добавлен минимальный AI env: `hub`, `active`, cards `MEM-NEST-1` / `BK-STAB-1`, local `history`, brief; todos = cards (без Obsidian kanban). Platform stubs указывают сюда.  
**Impact**: Сессии по Nest BFF читают только `.memory/`; submodule уносит memory с собой.  
**Reason**: Декомпозиция brain по образцу site pilot; AI-ENV Phase 5.
