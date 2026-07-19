# Content-facets culture media (seed fixtures)

Committed images for culture facet slots. Seed copies them into gitignored `uploads/` and registers `Media` rows.

## Layout

```text
assets/content-facets/culture/<slug>/
  preview.jpg   # PREVIEW slot — 320×320 (sidebar thumbnail)
  image-m.jpg   # IMAGE_M slot — 640×360 (hub / TagSurface)
  _source.png   # optional original (gitignored; not required at runtime)
```

## Tomato (`crop.tomato`)

- Slug: `tomato`
- Photoreal tomato still for SmartБотаник culture hubs / sidebar
- Regenerate sizes: `node scripts/prepare-tomato-facet-assets.cjs` (needs `_source.png`)

## Apply

```bash
npm run db:seed:culture-facets
```

Site consumers: `publishedCultureOptions` (sidebar PREVIEW) and `publishedTagSurface` (hub IMAGE_M).

Chip LOGO SVGs live separately under `assets/seed/culture-icons/`.
