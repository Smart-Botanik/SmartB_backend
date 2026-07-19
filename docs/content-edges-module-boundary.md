# Content edges module boundary (BK-MS-EDGES)

**ADR:** [ADR-0015](../../../memory/docs/adr/0015-content-facets-v1.md)  
**Module:** `src/modules/content-facets/`  
**Target service:** `content-edges` (`services/content-edges/` submodule)

## Ownership

| Concern | Owner |
|---------|--------|
| Prisma `ContentFacetProfile`, `ContentFacetSlot` | **content-edges** (after cutover) |
| Facets CRUD + published read | `ContentFacetsService` → remote |
| `TagSurface` / `publishedCultureOptions` | **BFF** (`TagSurfaceService`, `CultureOptionsService`) |
| Media bytes / `Media` table | **monolith** — opaque `mediaId` |
| Taxonomy tag rows | **taxonomy-service** |

## Proxy / cutover

Copy `CONTENT_EDGES_*` from [`../.env.example`](../.env.example). With cutover on (default when not `"false"`), BFF requires a live content-edges process on `:3013` and proxies facet CRUD / published read there; TagSurface and culture-options stay composed in this module.

| Env | Purpose |
|-----|---------|
| `CONTENT_EDGES_SERVICE_URL` | e.g. `http://localhost:3013` |
| `CONTENT_EDGES_SERVICE_INTERNAL_KEY` | Header `X-Content-Edges-Internal-Key` |
| `CONTENT_EDGES_CUTOVER` | `true` → remote required |
| `CONTENT_EDGES_DATABASE_URL` | Target for `npm run db:export-content-edges` |

Smoke (with taxonomy + content-edges up): `npm run test:content-facets:e2e`, `test:culture-options:e2e`, `test:tag-surface:e2e`.

## Migration

```bash
npm run db:export-content-edges
npm run db:verify-content-edges-export
```

Service README: [`../../services/content-edges/README.md`](../../services/content-edges/README.md)
