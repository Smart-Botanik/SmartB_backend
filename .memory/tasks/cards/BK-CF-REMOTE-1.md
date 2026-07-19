# BK-CF-REMOTE-1 — Content-edges remote: not-found ≠ 503

**Статус:** done (2026-07-19)  
**Owner:** backend_nest (BFF) · **Role:** [Backend]  
**Inbound from:** [`services/content-edges/.memory/tasks/cards/CE-OUT-1.md`](../../../services/content-edges/.memory/tasks/cards/CE-OUT-1.md)  
**ADR:** platform `0015` (facets via content-edges)

---

## Problem

`ContentEdgesRemoteGraphqlClient.execute` maps **every** remote GraphQL `errors[]` entry to `ServiceUnavailableException` (503).

When content-edges returns domain miss (`Content facet profile not found`), admin sees **503 / INTERNAL_SERVER_ERROR** instead of empty profile.

Admin (`contentFacetApi.getProfile`) and contracts (`contentFacetProfile: ContentFacetProfile` nullable) expect **`null`** for missing profile (empty culture facet editor).

---

## Fix (shipped)

1. **`content-edges-remote.graphql-client.ts`**
   - Domain miss (404 / `NOT_FOUND` / message `not found`) → `NotFoundException`
   - Transport / other GraphQL errors → still `ServiceUnavailableException` (503)
2. **`ContentFacetsRemoteService.getProfileBySubject`**
   - Returns `null` on remote miss (nullable contract for admin empty-state)
   - `fetchProfileSlots` treats miss as `[]`
3. Seed / empty profiles — content-edges (out of scope here)

---

## Files

- `src/modules/content-facets/content-edges-remote.graphql-client.ts`
- `src/modules/content-facets/content-facets.remote-service.ts`
- `src/modules/content-facets/content-facets.service.ts`

---

## Acceptance

- [x] Missing profile → GraphQL `data.contentFacetProfile: null`, no 503
- [x] Real content-edges down → still 503 with clear message
- [ ] Existing published/admin happy paths green — CE-OUT-1 retest

---

## Retest handoff

→ CE-OUT-1: open culture without facet row → null; with row → profile; upsert/publish unchanged.
