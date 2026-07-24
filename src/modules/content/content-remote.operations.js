"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MUTATION_UNPUBLISH_SITE_PAGE = exports.MUTATION_PUBLISH_SITE_PAGE = exports.MUTATION_UPSERT_SITE_PAGE = exports.MUTATION_UNPUBLISH_CROP_GUIDE = exports.MUTATION_PUBLISH_CROP_GUIDE = exports.MUTATION_DELETE_CROP_GUIDE = exports.MUTATION_UPDATE_CROP_GUIDE = exports.MUTATION_CREATE_CROP_GUIDE = exports.QUERY_PUBLISHED_SITE_PAGE = exports.QUERY_SITE_PAGE = exports.QUERY_SITE_PAGES = exports.QUERY_PUBLISHED_CROP_GUIDE = exports.QUERY_PUBLISHED_CROP_GUIDES = exports.QUERY_CROP_GUIDE_BY_SLUG = exports.QUERY_CROP_GUIDE = exports.QUERY_CROP_GUIDES = exports.SITE_PAGE_FIELDS = exports.CROP_GUIDE_FIELDS = exports.TAXONOMY_TAG_ON_GUIDE_FIELDS = void 0;
exports.TAXONOMY_TAG_ON_GUIDE_FIELDS = `
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
exports.CROP_GUIDE_FIELDS = `
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
    ${exports.TAXONOMY_TAG_ON_GUIDE_FIELDS}
  }
`;
exports.SITE_PAGE_FIELDS = `
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
exports.QUERY_CROP_GUIDES = `
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
        ${exports.CROP_GUIDE_FIELDS}
      }
    }
  }
`;
exports.QUERY_CROP_GUIDE = `
  query CropGuide($id: ID!) {
    cropGuide(id: $id) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.QUERY_CROP_GUIDE_BY_SLUG = `
  query CropGuideBySlug($slug: String!) {
    cropGuideBySlug(slug: $slug) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.QUERY_PUBLISHED_CROP_GUIDES = `
  query PublishedCropGuides($cropKind: CropKind, $termKey: String) {
    publishedCropGuides(cropKind: $cropKind, termKey: $termKey) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.QUERY_PUBLISHED_CROP_GUIDE = `
  query PublishedCropGuide($slug: String!) {
    publishedCropGuide(slug: $slug) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.QUERY_SITE_PAGES = `
  query SitePages($status: ContentStatus) {
    sitePages(status: $status) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
exports.QUERY_SITE_PAGE = `
  query SitePage($key: String!) {
    sitePage(key: $key) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
exports.QUERY_PUBLISHED_SITE_PAGE = `
  query PublishedSitePage($key: String!) {
    publishedSitePage(key: $key) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
exports.MUTATION_CREATE_CROP_GUIDE = `
  mutation CreateCropGuide($input: CreateCropGuideInput!) {
    createCropGuide(input: $input) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.MUTATION_UPDATE_CROP_GUIDE = `
  mutation UpdateCropGuide($id: ID!, $input: UpdateCropGuideInput!) {
    updateCropGuide(id: $id, input: $input) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.MUTATION_DELETE_CROP_GUIDE = `
  mutation DeleteCropGuide($id: ID!) {
    deleteCropGuide(id: $id)
  }
`;
exports.MUTATION_PUBLISH_CROP_GUIDE = `
  mutation PublishCropGuide($id: ID!) {
    publishCropGuide(id: $id) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.MUTATION_UNPUBLISH_CROP_GUIDE = `
  mutation UnpublishCropGuide($id: ID!) {
    unpublishCropGuide(id: $id) {
      ${exports.CROP_GUIDE_FIELDS}
    }
  }
`;
exports.MUTATION_UPSERT_SITE_PAGE = `
  mutation UpsertSitePage($input: UpsertSitePageInput!) {
    upsertSitePage(input: $input) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
exports.MUTATION_PUBLISH_SITE_PAGE = `
  mutation PublishSitePage($key: String!) {
    publishSitePage(key: $key) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
exports.MUTATION_UNPUBLISH_SITE_PAGE = `
  mutation UnpublishSitePage($key: String!) {
    unpublishSitePage(key: $key) {
      ${exports.SITE_PAGE_FIELDS}
    }
  }
`;
//# sourceMappingURL=content-remote.operations.js.map