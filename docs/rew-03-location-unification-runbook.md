# REW-03 — Location unification runbook

**Когда:** после `prisma migrate deploy` с полями ADR-0013 на целевой среде.  
**Не блокирует:** UX-APP-PROT rollout (FE-API уже на unified Location).

## Порядок (dev / staging / prod)

```bash
cd backend_nest

# 1. Миграции Prisma (включая 20260703140000 catch-up и 20260703153000 DROP legacy)
npx prisma migrate deploy

# Dev DB уже на db push: только отметить catch-up без SQL
# npx prisma migrate resolve --applied 20260703140000_rew_grow_domain_catchup

# 2. Backfill CU → Location (+ orphan provision)
npm run db:backfill:location-unification
# dry-run: npx ts-node src/scripts/backfill-location-unification.ts --dry-run
# один CU:  --cultivation-unit-id=<id>
# без taxonomy DB: --skip-taxonomy
# без auto-создания Location для orphan CU: --skip-orphan-provision

# 3. Verify REW-03
npm run db:verify:location-unification

# 4. Plant placement (если есть legacy cultivationUnitId / locationId)
npm run db:backfill:plant-placement

# 5. Pre-cutover gate (перед BK-REW-01-3 на новой среде)
npm run db:verify:location-legacy-cleanup

# 6. BK-REW-01-3 — DROP legacy columns (migration 20260703153000)
npx prisma migrate deploy
npm run db:verify:location-legacy-cleanup

# 7. REW-04 LocationGroup — seed dev fixtures + smoke
npm run db:seed:location-groups
npm run db:verify:location-groups

# 8. REW-06 Plant placement — dev fixtures + invariants
npm run db:seed:plant-placement
npm run db:verify:plant-placement

# 9. REW-05 Metrics — dev fixtures + projection smoke
npm run db:seed:metrics
npm run db:verify:metrics
```

## Dev checklist (2026-07-03)

| Step | Result |
|------|--------|
| migrate deploy | 18→19 migrations, schema up to date |
| backfill location-unification | 8 CU, all skip:existing |
| verify location-unification | 8/8 OK |
| backfill plant-placement | 0 rows (already migrated) |
| verify location-legacy-cleanup | post-cutover green |
| REW-04 seed + verify | after `db:seed:location-groups` |
| REW-06 seed + verify | `db:seed:plant-placement` → 3 stages |
| REW-05 seed + verify | `db:seed:metrics` → projection buckets |

## Orphan CU

Если verify сообщает `orphan_no_location` — CU без `primaryLocationId` и без primary placement.  
Backfill **по умолчанию** создаёт Location из полей CU (name, type/subType, capacity, specBlocks, seats) и связывает primary placement.

## Exit codes

| Script | 0 | 1 | 2 |
|--------|---|---|---|
| `db:verify:location-unification` | OK | issues | — |
| `db:backfill:location-unification` | OK | error | multi-placement |
| `db:verify:location-legacy-cleanup` | OK post-cutover | blockers | — |
| `db:verify:location-groups` | OK | error | — |
| `db:verify:plant-placement` | OK | invariants | — |
| `db:verify:metrics` | OK | projection | — |

## BK-REW-01-3 (dev ✅)

DROP `Location.type`, `subType`, `capacity`, `occupiedSlots`, `parentLocationId`.  
API: Location отдаёт `environmentTagId` / `environmentGroupSlug`; create/update принимает legacy `subType`/`capacity` как bridge.

## REW-04 LocationGroup

GraphQL CRUD + attach/detach; FE-API: `packages/mst-models/src/queries/location-groups.ts` + `GrowingRootStore.fetchLocationGroups*`.  
**Not Metrics** — spatial grouping only (ADR-0013 §3).

## REW-06 Plant placement

GraphQL `plantPlacementPlan|Queue|Seat|Transplant`; FE-API `usePlantPlacement`.  
Dev: `npm run db:seed:plant-placement` → 3 plants (planned / queue / seated @ A1).

## REW-05 Metrics

GraphQL CRUD + `Metric.projection` + `createPlantWithMetric`; FE-API `useMetrics` / `useMetric`.  
Dev: `npm run db:seed:metrics` → projection buckets on `seed:rew-05:full-garden`.
