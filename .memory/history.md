# Nest history (local)

> Локальный лог `backend_nest/`. **Не** копия platform `memory/project/history.md`.  
> Шаблон: date · role · change · impact · reason.

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
