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

# 5. Gate перед BK-REW-01-3 (DROP legacy columns)
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
| `db:verify:location-legacy-cleanup` | ready Phase C | blockers | — |

## Следующий шаг

**BK-REW-01-3** — после green gate на **каждой** среде: DROP `Location.type`, `subType`, `capacity`, `occupiedSlots`, `parentLocationId`.  
См. [ADR-0013 §6.1 Phase C](../../memory/docs/adr/0013-location-unification-v1.md).
