# Media module boundary (BK-MS-MEDIA / ADR-0018)

**ADR:** [ADR-0018](../../../memory/docs/adr/0018-media-service-extract-v1.md)  
**Modules (BFF):** `src/modules/media/`  
**Target service:** `media-service` (`services/media/` ← `Smart-Botanik/SB_media-service`)

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `Media` | **media-service** (after cutover) |
| REST upload / list / delete / crop / stats | `MediaService` on media-service |
| Local disk `uploads/` + Sharp | media-service |
| Static `GET /uploads/*` | media-service (BFF may proxy) |
| GraphQL type `Media` + field stitch (`avatar`, `cover`, MD) | **BFF** — resolve via media-service HTTP |
| Opaque `avatarMediaId`, `coverMediaId`, `media://id` | consumers (reference-data, content, …) |

## Public API (for other BFF modules)

Import **`MediaService`** (local or remote DI) from the media module.  
Do **not** use `prisma.media` outside media module after cutover.

## Cross-domain rules

| Dependency | Allowed |
|------------|---------|
| **Content / Brands / Products** | Store opaque media id only; resolve URL via BFF Media stitch |
| **Taxonomy / Facets** | No FK to Media |

## Forbidden

- FK from other service DBs to `Media`
- Writing `Media` rows into `grow_db` after cutover
- Changing client REST paths (`/media/*`, `/uploads/*`) on extract

## REST surface (unchanged for clients via BFF)

| Method | Path |
|--------|------|
| `POST` | `/media/upload`, `/media/upload-with-crop`, `/media/crop-image`, `/media/get-image-info` |
| `POST` | `/media/admin/media/upload`, `/media/admin/media/upload-with-crop` |
| `GET` | `/media/admin/media`, `/media/admin/media/stats`, `/media/admin/media/:id` |
| `PUT` / `DELETE` | `/media/admin/media/:id` |
| `GET` | `/uploads/{path}` |

## Proxy / cutover

| Env | Purpose |
|-----|---------|
| `MEDIA_SERVICE_URL` | e.g. `http://localhost:3016` |
| `MEDIA_SERVICE_INTERNAL_KEY` | Header `X-Media-Internal-Key` |
| `MEDIA_CUTOVER` | `true` → remote required; no local Prisma Media |
| `MEDIA_DATABASE_URL` | Target for `npm run db:export-media` |

Standalone: [`../../services/media/README.md`](../../services/media/README.md) (after scaffold).

## Cutover checklist (BK-MS-MEDIA-2)

- [ ] Submodule + `media_db` :5439 + service :3016
- [ ] BFF remote proxy for `/media` and `/uploads`
- [ ] GraphQL/MD resolve via remote `findById`
- [ ] Export/verify + drop monolith `Media` model
- [ ] Seeds/e2e use media-service API
