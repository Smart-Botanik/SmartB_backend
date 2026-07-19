# Nest BFF — AI session contract

> **Минимальный AI env** для `backend_nest/` (NestJS BFF + Prisma / grow_db).  
> Не читай корневой `growing-app/memory/` целиком — только то, что ниже, плюс MCP / точечные ссылки.

## Старт сессии

1. [`.memory/hub.md`](./hub.md) — WIP и фокус
2. [`.memory/tasks/active.md`](./tasks/active.md) — открытые хвосты
3. Карточка из `tasks/cards/` при работе над ID

## Todos (дешёвый канон)

| Артефакт | Роль |
|----------|------|
| `tasks/active.md` | WIP-список (≤5) |
| `tasks/cards/<ID>.md` | чеклисты, handoff, статус |
| `history.md` | локальные вехи BFF |

**Нет** Obsidian Kanban в этом репо — не синхронизировать `memory/tasks/kanban.md` при nest-работе (кроме cross-cut вех).

## Platform (только по необходимости)

| Нужно | Куда |
|-------|------|
| ADR / cross-cut | **growing-brain** MCP (`get_adr`, `get_history`) или один файл `../../memory/docs/adr/` |
| Platform hub / WIP других apps | **growing-project** `get_hub_summary` / `list_active_wip` |
| Content / TG / edges services | platform cards `BK-MS-CONTENT`, `TG-INT-1` — не дублировать чеклисты MS здесь |
| Contracts | `../../packages/contracts` |

## Обновления после значимого шага

1. Чеклист в `tasks/cards/<ID>.md`
2. Строка в `tasks/active.md` при смене WIP
3. Краткая веха в `history.md` (date · role · change · impact · reason)
4. Cross-cutting milestone → platform `memory/project/history.md` (cutover / ADR)

## Код

Только дерево `backend_nest/` (+ контракты в `packages/contracts` при API-изменениях).  
Микросервисы `services/*` — свои `.memory` / репо; BFF держит proxy + compose (TagSurface и т.п.).
