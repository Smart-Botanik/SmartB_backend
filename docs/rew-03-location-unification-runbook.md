# REW-03 — Location unification runbook

**Когда:** после `prisma migrate deploy` с полями ADR-0013 на целевой среде.  
**Не блокирует:** UX-APP-PROT rollout (FE-API уже на unified Location).

## Порядок (dev / staging / prod)

```bash
cd backend_nest

# 1. Миграции Prisma
npx prisma migrate deploy

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
```

## Orphan CU

Если verify сообщает `orphan_no_location` — CU без `primaryLocationId` и без primary placement.  
Backfill **по умолчанию** создаёт Location из полей CU (name, type/subType, capacity, specBlocks, seats) и связывает primary placement.

## Exit codes

| Script | 0 | 1 | 2 |
|--------|---|---|---|
| `db:verify:location-unification` | OK | issues | — |
| `db:backfill:location-unification` | OK | error | multi-placement |
| `db:verify:location-legacy-cleanup` | OK post-cutover | blockers | — |

## BK-REW-01-3 (dev ✅)

DROP `Location.type`, `subType`, `capacity`, `occupiedSlots`, `parentLocationId`.  
API: Location отдаёт `environmentTagId` / `environmentGroupSlug`; create/update принимает legacy `subType`/`capacity` как bridge.
