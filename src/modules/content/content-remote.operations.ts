export const TAXONOMY_TAG_ON_GUIDE_FIELDS = `
  id
  key
  label
  scopeKey
  namespace
  sortOrder
  parentId
  cropKind
  variantAxis
  status
`;

/** Remote CropGuide fields — no `cover` (BFF stitches Media via coverMediaId). */
export const CROP_GUIDE_FIELDS = `
  id
  cropKind
  slug
  title
  excerpt
  body
  bodySiteMd
  bodyTelegramMd
  coverMediaId
  status
  publishedAt
  seoTitle
  seoDescription
  sortOrder
  telegramPublishedAt
  telegramMessageId
  telegramPostUrl
  createdAt
  updatedAt
  taxonomyTags {
    ${TAXONOMY_TAG_ON_GUIDE_FIELDS}
  }
`;

export const SITE_PAGE_FIELDS = `
  id
  key
  title
  sections
  status
  publishedAt
  seoTitle
  seoDescription
  createdAt
  updatedAt
`;

export const QUERY_CROP_GUIDES = `
  query CropGuides(
    $limit: Int
    $offset: Int
    $cropKind: CropKind
    $status: ContentStatus
    $query: String
    $termKey: String
  ) {
    cropGuides(
      limit: $limit
      offset: $offset
      cropKind: $cropKind
      status: $status
      query: $query
      termKey: $termKey
    ) {
      total
      items {
        ${CROP_GUIDE_FIELDS}
      }
    }
  }
`;

export const QUERY_CROP_GUIDE = `
  query CropGuide($id: ID!) {
    cropGuide(id: $id) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const QUERY_CROP_GUIDE_BY_SLUG = `
  query CropGuideBySlug($slug: String!) {
    cropGuideBySlug(slug: $slug) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const QUERY_PUBLISHED_CROP_GUIDES = `
  query PublishedCropGuides($cropKind: CropKind, $termKey: String) {
    publishedCropGuides(cropKind: $cropKind, termKey: $termKey) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const QUERY_PUBLISHED_CROP_GUIDE = `
  query PublishedCropGuide($slug: String!) {
    publishedCropGuide(slug: $slug) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const QUERY_SITE_PAGES = `
  query SitePages($status: ContentStatus) {
    sitePages(status: $status) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;

export const QUERY_SITE_PAGE = `
  query SitePage($key: String!) {
    sitePage(key: $key) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;

export const QUERY_PUBLISHED_SITE_PAGE = `
  query PublishedSitePage($key: String!) {
    publishedSitePage(key: $key) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;

export const MUTATION_CREATE_CROP_GUIDE = `
  mutation CreateCropGuide($input: CreateCropGuideInput!) {
    createCropGuide(input: $input) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_CROP_GUIDE = `
  mutation UpdateCropGuide($id: ID!, $input: UpdateCropGuideInput!) {
    updateCropGuide(id: $id, input: $input) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_CROP_GUIDE = `
  mutation DeleteCropGuide($id: ID!) {
    deleteCropGuide(id: $id)
  }
`;

export const MUTATION_PUBLISH_CROP_GUIDE = `
  mutation PublishCropGuide($id: ID!) {
    publishCropGuide(id: $id) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const MUTATION_UNPUBLISH_CROP_GUIDE = `
  mutation UnpublishCropGuide($id: ID!) {
    unpublishCropGuide(id: $id) {
      ${CROP_GUIDE_FIELDS}
    }
  }
`;

export const MUTATION_UPSERT_SITE_PAGE = `
  mutation UpsertSitePage($input: UpsertSitePageInput!) {
    upsertSitePage(input: $input) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;

export const MUTATION_PUBLISH_SITE_PAGE = `
  mutation PublishSitePage($key: String!) {
    publishSitePage(key: $key) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;

export const MUTATION_UNPUBLISH_SITE_PAGE = `
  mutation UnpublishSitePage($key: String!) {
    unpublishSitePage(key: $key) {
      ${SITE_PAGE_FIELDS}
    }
  }
`;
