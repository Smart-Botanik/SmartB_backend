/** Поля для taxonomyForest — без legacy cropKind. */
export const TAXONOMY_TAG_FOREST_FIELDS = `
  id
  scopeKey
  key
  namespace
  label
  sortOrder
  parentId
  variantAxis
  status
  createdAt
  updatedAt
  children {
    id
    scopeKey
    key
    namespace
    label
    sortOrder
    parentId
    variantAxis
    status
    children {
      id
      scopeKey
      key
      namespace
      label
      sortOrder
      parentId
      variantAxis
      status
    }
  }
`;

export const TAXONOMY_TAG_FIELDS = `
  id
  scopeKey
  key
  namespace
  label
  sortOrder
  parentId
  cropKind
  variantAxis
  status
  createdAt
  updatedAt
  children {
    id
    scopeKey
    key
    namespace
    label
    sortOrder
    parentId
    cropKind
    variantAxis
    status
    children {
      id
      scopeKey
      key
      namespace
      label
      sortOrder
      parentId
      cropKind
      variantAxis
      status
    }
  }
`;

export const QUERY_TAXONOMY_SCOPES = `
  query TaxonomyScopes {
    taxonomyScopes {
      key
      label
      description
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

export const QUERY_TAXONOMY_TAGS = `
  query TaxonomyTags(
    $limit: Int
    $offset: Int
    $query: String
    $scopeKey: String
    $namespace: TaxonomyTagNamespace
    $parentId: ID
    $cropKind: CropKind
    $status: TaxonomyTagStatus
  ) {
    taxonomyTags(
      limit: $limit
      offset: $offset
      query: $query
      scopeKey: $scopeKey
      namespace: $namespace
      parentId: $parentId
      cropKind: $cropKind
      status: $status
    ) {
      total
      items {
        ${TAXONOMY_TAG_FIELDS}
      }
    }
  }
`;

export const QUERY_TAXONOMY_FOREST = `
  query TaxonomyForest($scopeKey: String!, $status: TaxonomyTagStatus) {
    taxonomyForest(scopeKey: $scopeKey, status: $status) {
      ${TAXONOMY_TAG_FOREST_FIELDS}
    }
  }
`;

export const QUERY_TAXONOMY_TAG = `
  query TaxonomyTag($id: ID!) {
    taxonomyTag(id: $id) {
      ${TAXONOMY_TAG_FIELDS}
    }
  }
`;

export const QUERY_TAXONOMY_TAGS_BY_KEYS = `
  query TaxonomyTagsByKeys($keys: [String!]!) {
    taxonomyTagsByKeys(keys: $keys) {
      ${TAXONOMY_TAG_FIELDS}
    }
  }
`;

/** Минимальный набор полей для connectByKeys (BK-MS-TAX-2b). */
export const QUERY_TAXONOMY_TAGS_BY_KEYS_MINIMAL = `
  query TaxonomyTagsByKeys($keys: [String!]!) {
    taxonomyTagsByKeys(keys: $keys) {
      id
      key
    }
  }
`;

export const MUTATION_CREATE_SCOPE = `
  mutation CreateTaxonomyScope($input: CreateTaxonomyScopeInput!) {
    createTaxonomyScope(input: $input) {
      key
      label
      description
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

export const MUTATION_CREATE_TAG = `
  mutation CreateTaxonomyTag($input: CreateTaxonomyTagInput!) {
    createTaxonomyTag(input: $input) {
      ${TAXONOMY_TAG_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_TAG = `
  mutation UpdateTaxonomyTag($id: ID!, $input: UpdateTaxonomyTagInput!) {
    updateTaxonomyTag(id: $id, input: $input) {
      ${TAXONOMY_TAG_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_TAG = `
  mutation DeleteTaxonomyTag($id: ID!) {
    deleteTaxonomyTag(id: $id)
  }
`;

export const MUTATION_DELETE_GROUP = `
  mutation DeleteTaxonomyGroup(
    $id: ID!
    $strategy: TaxonomyGroupDeleteStrategy!
    $newParentId: ID
  ) {
    deleteTaxonomyGroup(id: $id, strategy: $strategy, newParentId: $newParentId)
  }
`;
