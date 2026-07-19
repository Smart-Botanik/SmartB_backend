export const CONTENT_FACET_SLOT_FIELDS = `
  id
  kind
  role
  mediaId
  textValue
  sortOrder
`;

export const CONTENT_FACET_PROFILE_FIELDS = `
  id
  subjectType
  subjectId
  subjectKey
  profileKind
  status
  revision
  publishedAt
  createdAt
  updatedAt
  slots {
    ${CONTENT_FACET_SLOT_FIELDS}
  }
`;

export const CONTENT_FACET_BUNDLE_FIELDS = `
  subjectType
  subjectId
  subjectKey
  profileKind
  revision
  chipIcon
  words {
    hubTitle
    hubLead
    chipCaption
    seoDescription
    aboutShort
    highlight
  }
`;

export const QUERY_PUBLISHED_CONTENT_FACETS = `
  query PublishedContentFacets($subject: ContentFacetSubjectInput!) {
    publishedContentFacets(subject: $subject) {
      ${CONTENT_FACET_BUNDLE_FIELDS}
    }
  }
`;

export const QUERY_PUBLISHED_CONTENT_FACETS_BATCH = `
  query PublishedContentFacetsBatch($subjects: [ContentFacetSubjectInput!]!) {
    publishedContentFacetsBatch(subjects: $subjects) {
      ${CONTENT_FACET_BUNDLE_FIELDS}
    }
  }
`;

export const QUERY_CONTENT_FACET_PROFILE = `
  query ContentFacetProfile($subject: ContentFacetSubjectInput!) {
    contentFacetProfile(subject: $subject) {
      ${CONTENT_FACET_PROFILE_FIELDS}
    }
  }
`;

export const MUTATION_UPSERT_CONTENT_FACET_PROFILE = `
  mutation UpsertContentFacetProfile($input: UpsertContentFacetProfileInput!) {
    upsertContentFacetProfile(input: $input) {
      ${CONTENT_FACET_PROFILE_FIELDS}
    }
  }
`;

export const MUTATION_PUBLISH_CONTENT_FACET_PROFILE = `
  mutation PublishContentFacetProfile($subject: ContentFacetSubjectInput!) {
    publishContentFacetProfile(subject: $subject) {
      ${CONTENT_FACET_PROFILE_FIELDS}
    }
  }
`;

export const MUTATION_UNPUBLISH_CONTENT_FACET_PROFILE = `
  mutation UnpublishContentFacetProfile($subject: ContentFacetSubjectInput!) {
    unpublishContentFacetProfile(subject: $subject) {
      ${CONTENT_FACET_PROFILE_FIELDS}
    }
  }
`;
