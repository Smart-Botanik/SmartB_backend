# Content-facets culture media (seed fixtures)

Committed images for culture facet slots. Seed uploads them into media-service
and binds `mediaId`s on published `culture_tag` profiles.

## Layout

```text
assets/content-facets/culture/<slug>/
  logo.png      # LOGO slot — PNG chip icon (required for seed)
  preview.jpg   # PREVIEW slot — 320×320 (optional; tomato today)
  image-m.jpg   # IMAGE_M slot — 640×360 hub (optional; tomato today)
  _source.png   # optional original (gitignored; not required at runtime)
```

## Crops in starting seed (2026-07-24)

| key | slug | LOGO | PREVIEW / IMAGE_M |
|-----|------|------|-------------------|
| `crop.tomato` | `tomato` | ✅ | ✅ |
| `crop.pepper` | `pepper` | ✅ | — |
| `crop.cucumber` | `cucumber` | ✅ | — |
| `crop.potato` | `potato` | ✅ | — |
| `crop.cabbage` | `cabbage` | ✅ | — |
| `crop.pumpkin` | `pumpkin` | ✅ | — |
| `crop.zucchini` | `zucchini` | ✅ | — |
| `crop.eggplant` | `eggplant` | ✅ | — |

LOGO PNGs were exported from the live media-service uploads used in admin
(icons-hub → Media → LOGO). Tomato PREVIEW/IMAGE_M are the existing photoreal fixtures.

## Apply

```bash
# taxonomy + content-edges + media-service must be up
npm run db:seed:culture-facets
```

Requires:

- `TAXONOMY_SERVICE_URL`
- `CONTENT_EDGES_SERVICE_URL`
- `MEDIA_SERVICE_URL` (+ `MEDIA_SERVICE_INTERNAL_KEY`)

Site consumers:

- `publishedCultureOptions` — chip LOGO (PNG) via `icon.kind=MEDIA`
- `publishedTagSurface` — hub IMAGE_M when present
- sidebar PREVIEW when present

Emoji TEXT `chip_icon` is still written as fallback; resolve prefers LOGO PNG
(`resolveCultureChipIcon` in `@growing/contracts`).

Legacy SVG placeholders (unused by Media apply): `assets/seed/culture-icons/`.
