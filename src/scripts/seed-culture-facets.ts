import { PrismaClient } from "@prisma/client";
import {
  CONTENT_FACET_TEXT_ROLES,
  CULTURE_CHIP_EMOJI_FALLBACKS,
} from "@growing/contracts";
import { ContentFacetsService } from "../modules/content-facets/content-facets.service";
import type { TaxonomyTagService } from "../modules/taxonomy/taxonomy-tag.service";

const CROP_ROOT_KEYS = Object.keys(CULTURE_CHIP_EMOJI_FALLBACKS);

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

    const emoji = CULTURE_CHIP_EMOJI_FALLBACKS[key];
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
