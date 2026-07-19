# Nest BFF — brief

**Роль:** NestJS **BFF** + Prisma **grow_db** (`backend_nest`).  
**Клиенты:** main app, admin, site → GraphQL `/graphql` (:3001).  
**Platform vision:** [`../../../memory/docs/core/03-backend.md`](../../../memory/docs/core/03-backend.md)

## Границы

| В этом репо | Вне (MS) |
|-------------|----------|
| Grow domain (Plant, Location, CU, Event, Diary) | taxonomy-service |
| Stream Registry / Action Path | reference-data (Brand/Product) |
| Media upload (v1) | content-service |
| BFF compose: TagSurface, CultureOptions | content-edges (facets) |
| Auth JWT gateway / proxy | — |

## Extract policy

Strangler fig: [ADR-0009](../../../memory/docs/adr/0009-domain-microservices-extraction-v1.md), content [ADR-0016](../../../memory/docs/adr/0016-content-service-extract-v1.md).

## AI

Сессия: [`../AGENTS.md`](../AGENTS.md). Platform ADR — через **growing-brain** MCP.
