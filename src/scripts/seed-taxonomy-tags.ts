/** Canonical TaxonomyTag keys per published guide slug (BK-MS-TAX-3). */
export const GUIDE_TAXONOMY_TAG_KEYS_BY_SLUG: Record<string, string[]> = {
  "vyrashchivanie-tomatov": ["crop.tomato", "topic.growing"],
  "vyrashchivanie-determinantnyh-tomatov": [
    "crop.tomato",
    "crop.tomato.determinate",
    "topic.growing",
  ],
  "tomato-outdoor-bed-start": [
    "crop.tomato",
    "environment.type.outdoor.bed",
    "topic.growing",
  ],
  "growbox-light-ventilation": [
    "environment.type.indoor.growbox",
    "topic.growing",
  ],
};
