# BK-STAB-1 — Backend API stabilization

**Статус:** active (continuous)  
**Скоуп:** не занимает platform WIP board  
**Модуль:** backend_nest  
**Видение:** [`../../../memory/docs/core/03-backend.md`](../../../memory/docs/core/03-backend.md)  
**Platform stub:** [`../../../memory/tasks/cards/BK-STAB-1.md`](../../../memory/tasks/cards/BK-STAB-1.md)

---

## Цель

Предсказуемые DTO/ошибки/валидация для фронта; хвосты CRUD без отдельного platform WIP-скоупа.

---

## Чеклист

- [ ] Global validation pipes / filters; единый формат ошибок
- [ ] **BK-PR-1** Products GraphQL ACL + brand/media checks
- [ ] **BK-LOC** tail — REW-01 / locations (grow domain)
- [ ] **BK-5/6** Event Definitions + Tag mapping (admin write)
- [ ] **BK-MS-MEDIA-1** media module boundary (Phase 0 hygiene)

## Microservices (done track)

- [x] Taxonomy extract BK-MS-TAX-1..3
- [x] Reference data BK-MS-REFDATA-1..3
- [x] Content BK-MS-CONTENT
- [x] Content edges BK-MS-EDGES-1

---

## Детали

- Legacy full backlog: platform `memory/tasks/archive/legacy-todos/backend-todos.md`
- BFF compose остаётся здесь: TagSurface, CultureOptions, media stitch, JWT gateway
