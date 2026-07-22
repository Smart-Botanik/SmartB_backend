# Nest BFF — active

WIP limit: **≤ 5**. Канон: этот файл + [`cards/`](./cards/). **Без** Obsidian Kanban.

## Active

1. [ ] **BK-STAB-1** — Backend API stabilization (continuous)
   - Next: validation pipes / BK-PR-1 / media boundary hygiene
   - Card: [`cards/BK-STAB-1.md`](./cards/BK-STAB-1.md)
2. [ ] **BK-MS-MEDIA-2** — Media service extract (BFF proxy + cutover)
   - Card: [`cards/BK-MS-MEDIA-2.md`](./cards/BK-MS-MEDIA-2.md)
3. [ ] **BK-MS-GALLERY-1** — Galleries + MediaEntry (media-service + BFF proxy)
   - Platform card: [`../../memory/tasks/cards/BK-MS-GALLERY-1.md`](../../memory/tasks/cards/BK-MS-GALLERY-1.md)
   - Next: live smoke :3016; then BK-CONTENT-GALLERY-1 / admin UI
4. [~] **BK-ENGAGE-BFF-1** — cancelled: nest = app only; site → social-service
   - Card: [`cards/BK-ENGAGE-BFF-1.md`](./cards/BK-ENGAGE-BFF-1.md)

## Done (кратко)

| Дата | ID | Суть |
|------|-----|------|
| 2026-07-23 | BK-ENGAGE-BFF-1 | Cancelled — social not on nest; ADR-0020 amended |
| 2026-07-22 | BK-CF-CHIP-PNG-1 | LOGO PNG wins over emoji in `resolveCultureChipIcon` |
| 2026-07-19 | BK-CF-REMOTE-1 | Facet profile miss → null (not 503); CE-OUT-1 retest |
| 2026-07-15 | MEM-NEST-1 | `.memory` pilot + MCP nest scope |
| 2026-07-15 | BK-MS-EDGES / BK-CF-2 | Facets extract + TagSurface BFF (platform history) |
| 2026-07-10 | BK-MS-CONTENT | Content cutover ✅ |

## Notes

- MS extract cards остаются в platform / service `.memory`; здесь — BFF compose, grow_db, proxy, stabilization.
- Cross-link platform: `../../memory/hub.md` (пока nested monorepo).
