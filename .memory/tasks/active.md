# Nest BFF — active

WIP limit: **≤ 5**. Канон: этот файл + [`cards/`](./cards/). **Без** Obsidian Kanban.

## Active

1. [ ] **BK-STAB-1** — Backend API stabilization (continuous)
   - Next: validation pipes / BK-PR-1 / media boundary hygiene
   - Card: [`cards/BK-STAB-1.md`](./cards/BK-STAB-1.md)
2. [ ] **BK-MS-MEDIA-2** — Media service extract (BFF proxy + cutover)
   - Next: submodule scaffold + MEDIA_CUTOVER remote
   - Card: [`cards/BK-MS-MEDIA-2.md`](./cards/BK-MS-MEDIA-2.md)

## Done (кратко)

| Дата | ID | Суть |
|------|-----|------|
| 2026-07-19 | BK-CF-REMOTE-1 | Facet profile miss → null (not 503); CE-OUT-1 retest |
| 2026-07-15 | MEM-NEST-1 | `.memory` pilot + MCP nest scope |
| 2026-07-15 | BK-MS-EDGES / BK-CF-2 | Facets extract + TagSurface BFF (platform history) |
| 2026-07-10 | BK-MS-CONTENT | Content cutover ✅ |

## Notes

- MS extract cards остаются в platform / service `.memory`; здесь — BFF compose, grow_db, proxy, stabilization.
- Cross-link platform: `../../memory/hub.md` (пока nested monorepo).
