export const BRAND_FIELDS = `
  id
  name
  category
  description
  avatar {
    id
    url
  }
  createdAt
  updatedAt
`;

export const TAXONOMY_TAG_ON_PRODUCT_FIELDS = `
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
`;

export const PRODUCT_FIELDS = `
  id
  name
  category
  brand {
    ${BRAND_FIELDS}
  }
  avatar {
    id
    url
  }
  taxonomyTags {
    ${TAXONOMY_TAG_ON_PRODUCT_FIELDS}
  }
  createdAt
  updatedAt
`;

export const QUERY_BRANDS = `
  query Brands($limit: Int, $offset: Int, $query: String, $category: String) {
    brands(limit: $limit, offset: $offset, query: $query, category: $category) {
      total
      items {
        ${BRAND_FIELDS}
      }
    }
  }
`;

export const QUERY_BRAND = `
  query Brand($id: ID!) {
    brand(id: $id) {
      ${BRAND_FIELDS}
    }
  }
`;

export const QUERY_PRODUCTS = `
  query Products(
    $limit: Int
    $offset: Int
    $query: String
    $category: String
    $brandId: ID
  ) {
    products(limit: $limit, offset: $offset, query: $query, category: $category, brandId: $brandId) {
      total
      items {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

export const QUERY_PRODUCT = `
  query Product($id: ID!) {
    product(id: $id) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const MUTATION_CREATE_BRAND = `
  mutation CreateBrand($input: CreateBrandInput!) {
    createBrand(input: $input) {
      ${BRAND_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_BRAND = `
  mutation UpdateBrand($id: ID!, $input: UpdateBrandInput!) {
    updateBrand(id: $id, input: $input) {
      ${BRAND_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_BRAND = `
  mutation DeleteBrand($id: ID!) {
    deleteBrand(id: $id)
  }
`;

export const MUTATION_CREATE_PRODUCT = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_PRODUCT = `
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_PRODUCT = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;
