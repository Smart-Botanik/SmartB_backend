# BK-MS-MEDIA-2 — Media service extract (Nest view)

**Статус:** in progress · 2026-07-20  
**Platform card:** [`../../../memory/tasks/cards/BK-MS-MEDIA-2.md`](../../../memory/tasks/cards/BK-MS-MEDIA-2.md)  
**ADR:** [`../../../memory/docs/adr/0018-media-service-extract-v1.md`](../../../memory/docs/adr/0018-media-service-extract-v1.md)  
**Boundary:** [`../../docs/media-module-boundary.md`](../../docs/media-module-boundary.md)

## Nest-owned checklist

- [x] ADR-0018 + boundary doc
- [x] BFF `MEDIA_*` env + remote MediaService DI
- [x] Proxy `/media` + `/uploads` when cutover
- [x] Replace `prisma.media` in GraphQL stitch / seeds
- [ ] Drop `Media` from monolith Prisma after verify (schema removed; db push optional)
- [ ] Smoke: media-service :3014 + upload via BFF
