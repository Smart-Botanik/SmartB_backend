# BK-MS-MEDIA-2 — Media service extract (Nest view)

**Статус:** in progress · 2026-07-20  
**Platform card:** [`../../../memory/tasks/cards/BK-MS-MEDIA-2.md`](../../../memory/tasks/cards/BK-MS-MEDIA-2.md)  
**ADR:** [`../../../memory/docs/adr/0018-media-service-extract-v1.md`](../../../memory/docs/adr/0018-media-service-extract-v1.md)  
**Boundary:** [`../../docs/media-module-boundary.md`](../../docs/media-module-boundary.md)

## Nest-owned checklist

- [x] ADR-0018 + boundary doc
- [x] BFF `MEDIA_*` env + remote MediaService DI
- [x] Proxy `/media` + `/uploads` when cutover
- [x] Replace `prisma.media` in GraphQL stitch / seeds / content-facets
  - 2026-07-20: facets `loadMediaMap` / `resolveSlotMedia` → `MediaService`; typed `MediaRecord` (no `unknown` on controller)
- [ ] Drop `Media` from monolith Prisma after verify (schema removed; db push optional)
- [ ] Smoke: media-service :3015 + upload via BFF
- [ ] Seeds still calling `prisma.media` (`seed-culture-facets.js`, e2e) — migrate to media-service API
