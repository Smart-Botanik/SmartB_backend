export const QUERY_USER_PROFILE = `
  query UserProfile($id: ID!) {
    userProfile(id: $id) {
      id
      email
      displayName
      firstName
      lastName
      avatarMediaId
      createdAt
      updatedAt
    }
  }
`;

export const MUTATION_ENSURE_USER_PROFILE = `
  mutation EnsureUserProfile($input: EnsureUserProfileInput!) {
    ensureUserProfile(input: $input) {
      id
      email
      displayName
      firstName
      lastName
      avatarMediaId
      createdAt
      updatedAt
    }
  }
`;

export const MUTATION_UPDATE_USER_PROFILE = `
  mutation UpdateUserProfile($id: ID!, $input: UpdateUserProfileInput!) {
    updateUserProfile(id: $id, input: $input) {
      id
      email
      displayName
      firstName
      lastName
      avatarMediaId
      createdAt
      updatedAt
    }
  }
`;
