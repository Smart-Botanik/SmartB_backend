import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  CONTENT_FACET_TEXT_ROLES,
  CULTURE_CHIP_EMOJI_SEED,
} from "@growing/contracts";
import { ContentFacetsService } from "../modules/content-facets/content-facets.service";
import type { TaxonomyTagService } from "../modules/taxonomy/taxonomy-tag.service";

const CROP_ROOT_KEYS = Object.keys(CULTURE_CHIP_EMOJI_SEED);

/** Short Russian hub leads for culture_tag TEXT hub_lead. */
const CULTURE_HUB_LEADS: Record<string, string> = {
  "crop.tomato":
    "Томаты — от рассады до урожая: свет, полив, подкормки и частые ошибки в теплице и грунте.",
  "crop.pepper": "Сладкий и острый перец: температура, пикировка и стабильный завязь.",
  "crop.cucumber":
    "Огурцы в теплице и на грядке: шпалера, полив и защита от болезней.",
  "crop.potato": "Картофель: посадка, окучивание и хранение урожая без потерь.",
  "crop.cabbage": "Капуста: сроки посева, капуста в открытом грунте и защита от вредителей.",
  "crop.pumpkin": "Тыква: посев, место на грядке и хранение крупных плодов.",
  "crop.zucchini": "Кабачки: компактный урожай, полив и сбор молодых плодов.",
  "crop.eggplant": "Баклажаны: теплолюбивая культура — свет, почва и пасынкование.",
};

/** Extended presentation TEXT for tomato + cucumber hubs. */
const CULTURE_PRESENTATION_TEXT: Record<
  string,
  {
    hubTitle: string;
    aboutShort: string;
    seoDescription: string;
  }
> = {
  "crop.tomato": {
    hubTitle: "Томаты",
    aboutShort:
      "Томат — одна из самых популярных культур у дачников: от компактных детерминантных сортов для грунта до индетерминантных лиан в теплице. Здесь собраны обзорные гайды и узкие статьи по свету, поливу, подкормкам, формировке и типичным ошибкам. Выберите фильтр по типу куста или теме, чтобы быстрее найти нужный материал.",
    seoDescription:
      "Руководства по выращиванию томатов: рассада, теплица и открытый грунт, полив, подкормки и частые ошибки.",
  },
  "crop.cucumber": {
    hubTitle: "Огурцы",
    aboutShort:
      "Огурец отзывчив к теплу, влаге и опоре: в теплице и на шпалере проще держать урожай чистым и регулярным. На этой странице — обзорные материалы и практические гайды по поливу, подкормкам, защите от болезней и выбору способа выращивания. Отфильтруйте статьи по теме, чтобы сразу перейти к нужному этапу.",
    seoDescription:
      "Руководства по выращиванию огурцов: теплица и грядка, шпалера, полив, защита от болезней.",
  },
};

type CultureMediaSlot = "logo" | "image-m" | "preview";

const CULTURE_MEDIA_SLOT_META: Record<
  CultureMediaSlot,
  { kind: "LOGO" | "IMAGE_M" | "PREVIEW"; mime: string; ext: string }
> = {
  logo: { kind: "LOGO", mime: "image/png", ext: "png" },
  "image-m": { kind: "IMAGE_M", mime: "image/jpeg", ext: "jpg" },
  preview: { kind: "PREVIEW", mime: "image/jpeg", ext: "jpg" },
};

function cultureFacetMediaKey(cropKey: string, slot: CultureMediaSlot): string {
  const slug = cropKey.replace(/^crop\./, "");
  const { ext } = CULTURE_MEDIA_SLOT_META[slot];
  return `content-facets/culture/${slug}/${slot}.${ext}`;
}

function cultureFacetAssetPath(cropKey: string, slot: CultureMediaSlot): string {
  const slug = cropKey.replace(/^crop\./, "");
  const { ext } = CULTURE_MEDIA_SLOT_META[slot];
  return path.join(
    process.cwd(),
    "assets",
    "content-facets",
    "culture",
    slug,
    `${slot}.${ext}`,
  );
}

/** Copy committed fixture into gitignored uploads/ when present. */
async function syncCultureFacetAssetFile(
  cropKey: string,
  slot: CultureMediaSlot,
): Promise<{ size: number } | null> {
  const key = cultureFacetMediaKey(cropKey, slot);
  const assetPath = cultureFacetAssetPath(cropKey, slot);

  try {
    await fs.access(assetPath);
  } catch {
    return null;
  }

  const uploadsDir =
    process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "uploads");
  const destPath = path.join(uploadsDir, key);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(assetPath, destPath);
  const st = await fs.stat(destPath);
  return { size: st.size };
}

async function findExistingMediaIdByKey(
  baseUrl: string,
  internalKey: string,
  key: string,
): Promise<string | null> {
  const listRes = await fetch(
    `${baseUrl}/media/admin/media?search=${encodeURIComponent(key)}&limit=5`,
    { headers: { "X-Media-Internal-Key": internalKey } },
  );
  if (!listRes.ok) return null;
  const list = (await listRes.json()) as {
    media?: Array<{ id: string; key?: string }>;
  };
  const hit = list.media?.find((m) => m.key === key || m.key?.endsWith(key));
  return hit?.id ?? null;
}

/**
 * Upload culture facet asset into media-service (ADR-0018).
 * Returns null when fixture is absent (optional slots).
 */
async function ensureCultureFacetMedia(
  cropKey: string,
  slot: CultureMediaSlot,
  opts: { required: boolean },
): Promise<string | null> {
  const key = cultureFacetMediaKey(cropKey, slot);
  const { mime } = CULTURE_MEDIA_SLOT_META[slot];
  const assetPath = cultureFacetAssetPath(cropKey, slot);

  const baseUrl = (
    process.env.MEDIA_SERVICE_URL?.trim() || "http://localhost:3016"
  ).replace(/\/$/, "");
  const internalKey =
    process.env.MEDIA_SERVICE_INTERNAL_KEY?.trim() || "dev-media-internal";

  let fileBuffer: Buffer | null = null;
  try {
    fileBuffer = await fs.readFile(assetPath);
  } catch {
    fileBuffer = null;
  }

  if (!fileBuffer) {
    const existing = await findExistingMediaIdByKey(baseUrl, internalKey, key);
    if (existing) return existing;
    if (opts.required) {
      throw new Error(
        `Culture facet asset missing and no media row for key=${key} (${assetPath})`,
      );
    }
    return null;
  }

  await syncCultureFacetAssetFile(cropKey, slot);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mime }),
    path.basename(key),
  );
  form.append("folder", path.dirname(key).replace(/\\/g, "/"));
  form.append("entityType", "general");

  const uploadRes = await fetch(`${baseUrl}/media/admin/media/upload`, {
    method: "POST",
    headers: { "X-Media-Internal-Key": internalKey },
    body: form,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(
      `media-service upload failed HTTP ${uploadRes.status}: ${text}`,
    );
  }
  const created = (await uploadRes.json()) as { id: string };
  return created.id;
}

export async function seedCultureFacets(params: {
  prisma: PrismaClient;
  taxonomyTagService: TaxonomyTagService;
  contentFacetsService: ContentFacetsService;
}): Promise<{ published: number }> {
  const tags = (await params.taxonomyTagService.tagsByKeys(CROP_ROOT_KEYS)) as Array<{
    id: string;
    key: string;
  }>;

  const tagByKey = new Map(tags.map((tag) => [tag.key, tag]));
  let published = 0;

  for (const key of CROP_ROOT_KEYS) {
    const tag = tagByKey.get(key);
    if (!tag) {
      console.warn(`[seed-culture-facets] skip ${key}: tag not found in taxonomy`);
      continue;
    }

    const emoji = CULTURE_CHIP_EMOJI_SEED[key];
    const hubLead =
      CULTURE_HUB_LEADS[key] ?? `Гайды и материалы по культуре ${key}.`;
    const presentation = CULTURE_PRESENTATION_TEXT[key];

    // LOGO is the production chip icon (PNG). Required for all crop roots in seed.
    const logoMediaId = await ensureCultureFacetMedia(key, "logo", {
      required: true,
    });
    // Photoreal slots — optional until fixtures exist for every crop.
    const imageMMediaId = await ensureCultureFacetMedia(key, "image-m", {
      required: false,
    });
    const previewMediaId = await ensureCultureFacetMedia(key, "preview", {
      required: false,
    });

    const textSlots: Array<{
      kind: "TEXT";
      role: string;
      textValue: string;
      sortOrder: number;
    }> = [
      {
        kind: "TEXT",
        role: CONTENT_FACET_TEXT_ROLES.CHIP_ICON,
        textValue: emoji,
        sortOrder: 0,
      },
      {
        kind: "TEXT",
        role: CONTENT_FACET_TEXT_ROLES.HUB_LEAD,
        textValue: hubLead,
        sortOrder: 2,
      },
    ];

    if (presentation) {
      textSlots.push(
        {
          kind: "TEXT",
          role: CONTENT_FACET_TEXT_ROLES.HUB_TITLE,
          textValue: presentation.hubTitle,
          sortOrder: 1,
        },
        {
          kind: "TEXT",
          role: CONTENT_FACET_TEXT_ROLES.ABOUT_SHORT,
          textValue: presentation.aboutShort,
          sortOrder: 3,
        },
        {
          kind: "TEXT",
          role: CONTENT_FACET_TEXT_ROLES.SEO_DESCRIPTION,
          textValue: presentation.seoDescription,
          sortOrder: 4,
        },
      );
    }

    const mediaSlots: Array<{
      kind: "LOGO" | "IMAGE_M" | "PREVIEW";
      mediaId: string;
      sortOrder: number;
    }> = [
      {
        kind: "LOGO",
        mediaId: logoMediaId!,
        sortOrder: 5,
      },
    ];
    if (imageMMediaId) {
      mediaSlots.push({
        kind: "IMAGE_M",
        mediaId: imageMMediaId,
        sortOrder: 6,
      });
    }
    if (previewMediaId) {
      mediaSlots.push({
        kind: "PREVIEW",
        mediaId: previewMediaId,
        sortOrder: 7,
      });
    }

    await params.contentFacetsService.upsertProfile({
      subject: {
        type: "TAXONOMY_TAG",
        id: tag.id,
        key,
      },
      profileKind: "culture_tag",
      slots: [...textSlots, ...mediaSlots],
    });

    await params.contentFacetsService.publishProfile({
      type: "TAXONOMY_TAG",
      id: tag.id,
      key,
    });

    published += 1;
    console.log(
      `[seed-culture-facets] ${key}: LOGO` +
        (imageMMediaId ? "+IMAGE_M" : "") +
        (previewMediaId ? "+PREVIEW" : "") +
        " published",
    );
  }

  return { published };
}
