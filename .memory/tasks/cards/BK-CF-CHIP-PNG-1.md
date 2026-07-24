# BK-CF-CHIP-PNG-1 — Culture chip: LOGO PNG over emoji

**Статус:** done (2026-07-22)  
**Owner:** backend_nest (BFF + `@growing/contracts`) · **Role:** [Backend]  
**Related:** CE-CHIP-PNG-1 (tomato publish) · CE-CHIP-SVG-1 (LOGO-first follow-up) · SITE-1 finder

---

## Problem

Site sidebar «Культуры» не показывал PNG: admin уже залил LOGO PNG на все crop roots и опубликовал, но `publishedCultureOptions.icon` оставался `EMOJI` — `resolveCultureChipIcon` отдавал приоритет TEXT `chip_icon` над LOGO.

Только `crop.tomato` был MEDIA (emoji TEXT очищен в CE-CHIP-PNG-1).

---

## Fix

1. **`@growing/contracts` `resolveCultureChipIcon`** — порядок: LOGO → emoji TEXT → empty  
2. Consumers (`CultureOptionsService`) без изменений кода — тот же helper

---

## Acceptance

- [x] При наличии `logoMediaId` → `kind: MEDIA` даже если `chip_icon` emoji задан
- [x] Без LOGO → emoji fallback как раньше
- [x] BFF `publishedCultureOptions` — все 8 crop roots `icon.kind=MEDIA` + PNG url (2026-07-22)
- [ ] Site visual retest (SITE-1) — home ISR `revalidate=3600`; restart site / wait cache
- [x] Site `/guides` culture tabs — reuse `publishedCultureOptions` LOGO PNG via `CultureThumbnail` inline (2026-07-22)

## Notes

- Media apply path: PNG only (icons-hub). SVG placeholders в `assets/seed/culture-icons/` — legacy.
- Auto-publish после admin apply по-прежнему out of MVP.
- Guides tabs were still emoji-only (`CulturePresentation.emoji`); site now merges BFF chip icons.
