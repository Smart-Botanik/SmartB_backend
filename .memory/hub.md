# Nest hub

> **Старт:** этот файл → [`tasks/active.md`](./tasks/active.md) → card.  
> **AI:** [`AGENTS.md`](./AGENTS.md)

**Обновлено:** 2026-07-15 (memory pilot — вынос nest brain)

---

## Фокус

**BK-STAB-1** — continuous API hygiene (validation, ACL tails).  
**MEM-NEST-1** ✅ — AI env planted (2026-07-15).

---

## Активные (≤5)

| # | ID | Суть | Card |
|---|-----|------|------|
| 1 | BK-STAB-1 | BFF stabilization / continuous | [BK-STAB-1](./tasks/cards/BK-STAB-1.md) |
| 2 | BK-MS-MEDIA-2 | Media service extract + cutover | [BK-MS-MEDIA-2](./tasks/cards/BK-MS-MEDIA-2.md) |

Platform WIP (другие apps): `../../memory/hub.md` — не дублировать здесь.

---

## Недавно (локально)

| Дата | Суть |
|------|------|
| 2026-07-19 | BK-CF-REMOTE-1 — facet miss → null (не 503) |
| 2026-07-15 | `.memory/` pilot — cards + active, без kanban |

Полный локальный лог: [`history.md`](./history.md)

---

## Docs

| Doc | Путь |
|-----|------|
| Brief | [`docs/brief.md`](./docs/brief.md) |
| Platform vision | nested: `memory/docs/core/03-backend.md` |
| Microservices HOW | nested: `memory/docs/backend/microservices.md` |

---

## Dev quickstart

```bash
# DB (compose from monorepo root)
docker compose -f docker-compose.dev.yml up -d

cd backend_nest
npm run prisma:generate
npm run dev   # :3001  GraphQL /graphql
```

Cutover flags: see `.env.example` (`TAXONOMY_*`, `REFERENCE_DATA_*`, `CONTENT_*`, `CONTENT_EDGES_*`).

---

## Для агентов

1. Todos = **active + cards**, не Obsidian board.
2. Не тащить platform `history.md` / весь `docs/core/` в контекст.
3. Закрытие шага → card + `history.md`; platform milestone — только если cross-cut.
