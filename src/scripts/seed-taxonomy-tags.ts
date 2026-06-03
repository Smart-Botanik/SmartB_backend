import type { PrismaClient } from "@prisma/client";
import { TaxonomyTagNamespace, CropKind } from "@prisma/client";

type TagSeed = {
  key: string;
  namespace: TaxonomyTagNamespace;
  label: string;
  sortOrder: number;
  parentKey?: string;
  cropKind?: CropKind;
  variantAxis?: string;
};

const TAXONOMY_TAG_SEEDS: TagSeed[] = [
  {
    key: "crop.tomato",
    namespace: TaxonomyTagNamespace.CROP,
    label: "Томаты",
    sortOrder: 10,
    cropKind: CropKind.TOMATO,
  },
  {
    key: "crop.tomato.determinate",
    namespace: TaxonomyTagNamespace.CROP_VARIANT,
    label: "Детерминантный",
    sortOrder: 20,
    parentKey: "crop.tomato",
    variantAxis: "growth_habit",
  },
  {
    key: "crop.tomato.indeterminate",
    namespace: TaxonomyTagNamespace.CROP_VARIANT,
    label: "Индетерминантный",
    sortOrder: 30,
    parentKey: "crop.tomato",
    variantAxis: "growth_habit",
  },
  {
    key: "crop.cucumber",
    namespace: TaxonomyTagNamespace.CROP,
    label: "Огурцы",
    sortOrder: 15,
    cropKind: CropKind.CUCUMBER,
  },
  {
    key: "crop.cucumber.parthenocarpic",
    namespace: TaxonomyTagNamespace.CROP_VARIANT,
    label: "Партенокарпические",
    sortOrder: 25,
    parentKey: "crop.cucumber",
    variantAxis: "pollination",
  },
  {
    key: "crop.cucumber.self_pollinated",
    namespace: TaxonomyTagNamespace.CROP_VARIANT,
    label: "Самоопыляемые",
    sortOrder: 26,
    parentKey: "crop.cucumber",
    variantAxis: "pollination",
  },
  {
    key: "crop.cucumber.bee_pollinated",
    namespace: TaxonomyTagNamespace.CROP_VARIANT,
    label: "Пчелоопыляемые",
    sortOrder: 27,
    parentKey: "crop.cucumber",
    variantAxis: "pollination",
  },
  {
    key: "topic.growing",
    namespace: TaxonomyTagNamespace.TOPIC,
    label: "Выращивание",
    sortOrder: 40,
  },
];

/** Canonical TaxonomyTag keys per published guide slug. */
export const GUIDE_TAXONOMY_TAG_KEYS_BY_SLUG: Record<string, string[]> = {
  "vyrashchivanie-tomatov": ["crop.tomato", "topic.growing"],
  "vyrashchivanie-determinantnyh-tomatov": [
    "crop.tomato",
    "crop.tomato.determinate",
    "topic.growing",
  ],
};

async function ensureTaxonomyScopes(prisma: PrismaClient) {
  const scopes = [
    {
      key: "crop",
      label: "Культуры",
      description: "Иерархия культур и подтипов",
      sortOrder: 10,
    },
    {
      key: "guides",
      label: "Рубрики гайдов",
      description: "Темы и рубрики для статей",
      sortOrder: 20,
    },
  ];
  for (const scope of scopes) {
    await prisma.taxonomyScope.upsert({
      where: { key: scope.key },
      create: scope,
      update: {
        label: scope.label,
        description: scope.description,
        sortOrder: scope.sortOrder,
      },
    });
  }
}

function scopeKeyForSeed(def: TagSeed): "crop" | "guides" {
  if (def.namespace === TaxonomyTagNamespace.TOPIC || def.key.startsWith("topic.")) {
    return "guides";
  }
  return "crop";
}

export async function seedTaxonomyTags(prisma: PrismaClient) {
  await ensureTaxonomyScopes(prisma);
  const byKey = new Map<string, { id: string }>();

  for (const def of TAXONOMY_TAG_SEEDS) {
    const parentId = def.parentKey ? byKey.get(def.parentKey)?.id : undefined;
    const scopeKey = scopeKeyForSeed(def);
    const tag = await prisma.taxonomyTag.upsert({
      where: { key: def.key },
      create: {
        scopeKey,
        key: def.key,
        namespace: def.namespace,
        label: def.label,
        sortOrder: def.sortOrder,
        parentId,
        cropKind: def.cropKind,
        variantAxis: def.variantAxis,
      },
      update: {
        scopeKey,
        namespace: def.namespace,
        label: def.label,
        sortOrder: def.sortOrder,
        parentId,
        cropKind: def.cropKind ?? null,
        variantAxis: def.variantAxis ?? null,
        status: "ACTIVE",
      },
    });
    byKey.set(def.key, { id: tag.id });
  }

  const tags = [...byKey.values()];

  const breederBrand = await prisma.brand.findFirst({
    where: { category: "BREADER" },
    orderBy: { name: "asc" },
  });

  if (!breederBrand) {
    return { tags: tags.length, linkedProduct: null };
  }

  const cropTomato = byKey.get("crop.tomato");
  const determinate = byKey.get("crop.tomato.determinate");
  if (!cropTomato || !determinate) {
    return { tags: tags.length, linkedProduct: null };
  }

  const product = await prisma.product.upsert({
    where: {
      id: "product-seed-tomato-pink-paradise",
    },
    create: {
      id: "product-seed-tomato-pink-paradise",
      name: "Pink Paradise F1",
      category: "SEED",
      brandId: breederBrand.id,
      summarize: "Розовый детерминантный томат F1",
      taxonomyTags: { connect: [{ id: cropTomato.id }, { id: determinate.id }] },
    },
    update: {
      name: "Pink Paradise F1",
      category: "SEED",
      summarize: "Розовый детерминантный томат F1",
      taxonomyTags: { set: [{ id: cropTomato.id }, { id: determinate.id }] },
    },
  });

  return { tags: tags.length, linkedProduct: product.id };
}
