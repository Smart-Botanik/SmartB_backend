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
  "crop.cucumber": "Огурцы в теплице и на грядке: шпалера, полив и защита от болезней.",
  "crop.potato": "Картофель: посадка, окучивание и хранение урожая без потерь.",
  "crop.cabbage": "Капуста: сроки посева, капуста в открытом грунте и защита от вредителей.",
  "crop.zucchini": "Кабачки: компактный урожай, полив и сбор молодых плодов.",
  "crop.eggplant": "Баклажаны: теплолюбивая культура — свет, почва и пасынкование.",
};

const CULTURE_FACET_MEDIA_EXT = "jpg";
const CULTURE_FACET_MEDIA_MIME = "image/jpeg";

function cultureFacetMediaKey(
  cropKey: string,
  slot: "image-m" | "preview",
): string {
  const slug = cropKey.replace(/^crop\./, "");
  return `content-facets/culture/${slug}/${slot}.${CULTURE_FACET_MEDIA_EXT}`;
}

function cultureFacetAssetPath(
  cropKey: string,
  slot: "image-m" | "preview",
): string {
  const slug = cropKey.replace(/^crop\./, "");
  return path.join(
    process.cwd(),
    "assets",
    "content-facets",
    "culture",
    slug,
    `${slot}.${CULTURE_FACET_MEDIA_EXT}`,
  );
}

/** Copy committed fixture into gitignored uploads/ when present. */
async function syncCultureFacetAssetFile(
  cropKey: string,
  slot: "image-m" | "preview",
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

async function ensureCultureFacetMedia(
  prisma: PrismaClient,
  cropKey: string,
  slot: "image-m" | "preview",
): Promise<string> {
  const key = cultureFacetMediaKey(cropKey, slot);
  const width = slot === "image-m" ? 640 : 320;
  const height = slot === "image-m" ? 360 : 320;
  const synced = await syncCultureFacetAssetFile(cropKey, slot);

  const existing = await prisma.media.findFirst({ where: { key } });
  if (existing) {
    if (synced && existing.size !== synced.size) {
      await prisma.media.update({
        where: { id: existing.id },
        data: {
          size: synced.size,
          width,
          height,
          mime: CULTURE_FACET_MEDIA_MIME,
          url: `/uploads/${key}`,
        },
      });
    }
    return existing.id;
  }

  const created = await prisma.media.create({
    data: {
      provider: "local",
      bucket: "uploads",
      key,
      url: `/uploads/${key}`,
      mime: CULTURE_FACET_MEDIA_MIME,
      width,
      height,
      size: synced?.size,
    },
  });
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

  const tagByKey = new Map(tags.map(tag => [tag.key, tag]));
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
    const imageMMediaId = await ensureCultureFacetMedia(
      params.prisma,
      key,
      "image-m",
    );
    const previewMediaId = await ensureCultureFacetMedia(
      params.prisma,
      key,
      "preview",
    );

    await params.contentFacetsService.upsertProfile({
      subject: {
        type: "TAXONOMY_TAG",
        id: tag.id,
        key,
      },
      profileKind: "culture_tag",
      slots: [
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
          sortOrder: 1,
        },
        {
          kind: "IMAGE_M",
          mediaId: imageMMediaId,
          sortOrder: 2,
        },
        {
          kind: "PREVIEW",
          mediaId: previewMediaId,
          sortOrder: 3,
        },
      ],
    });

    await params.contentFacetsService.publishProfile({
      type: "TAXONOMY_TAG",
      id: tag.id,
      key,
    });

    published += 1;
  }

  return { published };
}
