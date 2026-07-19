export const TELEGRAM_BOT_FIELDS = `
  id
  name
  username
  tokenMasked
  isActive
  createdAt
  updatedAt
  channels {
    id
    name
    chatId
    botId
    isDefault
    isActive
    publicUrl
    createdAt
    updatedAt
  }
`;

export const TELEGRAM_CHANNEL_FIELDS = `
  id
  name
  chatId
  botId
  isDefault
  isActive
  publicUrl
  createdAt
  updatedAt
  bot {
    id
    name
    username
    tokenMasked
    isActive
    createdAt
    updatedAt
  }
`;

export const CROP_GUIDE_ON_TG_FIELDS = `
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
  }
`;

export const TELEGRAM_PUBLICATION_FIELDS = `
  id
  cropGuideId
  channelId
  botId
  channelName
  botName
  telegramMessageId
  telegramPostUrl
  publishedAt
  channel {
    ${TELEGRAM_CHANNEL_FIELDS}
  }
`;

export const QUERY_TELEGRAM_BOTS = `
  query TelegramBots {
    telegramBots {
      ${TELEGRAM_BOT_FIELDS}
    }
  }
`;

export const QUERY_TELEGRAM_BOT = `
  query TelegramBot($id: ID!) {
    telegramBot(id: $id) {
      ${TELEGRAM_BOT_FIELDS}
    }
  }
`;

export const QUERY_TELEGRAM_CHANNELS = `
  query TelegramChannels($botId: ID, $isActive: Boolean) {
    telegramChannels(botId: $botId, isActive: $isActive) {
      ${TELEGRAM_CHANNEL_FIELDS}
    }
  }
`;

export const QUERY_TELEGRAM_CHANNEL = `
  query TelegramChannel($id: ID!) {
    telegramChannel(id: $id) {
      ${TELEGRAM_CHANNEL_FIELDS}
    }
  }
`;

export const QUERY_TELEGRAM_DEFAULT_CHANNEL = `
  query TelegramDefaultChannel {
    telegramDefaultChannel {
      ${TELEGRAM_CHANNEL_FIELDS}
    }
  }
`;

export const QUERY_CROP_GUIDE_TELEGRAM_PUBLICATIONS = `
  query CropGuideTelegramPublications($cropGuideId: ID!, $limit: Int) {
    cropGuideTelegramPublications(cropGuideId: $cropGuideId, limit: $limit) {
      ${TELEGRAM_PUBLICATION_FIELDS}
    }
  }
`;

export const MUTATION_VALIDATE_TELEGRAM_BOT_TOKEN = `
  mutation ValidateTelegramBotToken($token: String!) {
    validateTelegramBotToken(token: $token) {
      telegramBotId
      username
      firstName
      isBot
    }
  }
`;

export const MUTATION_CREATE_TELEGRAM_BOT = `
  mutation CreateTelegramBot($input: CreateTelegramBotInput!) {
    createTelegramBot(input: $input) {
      ${TELEGRAM_BOT_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_TELEGRAM_BOT = `
  mutation UpdateTelegramBot($id: ID!, $input: UpdateTelegramBotInput!) {
    updateTelegramBot(id: $id, input: $input) {
      ${TELEGRAM_BOT_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_TELEGRAM_BOT = `
  mutation DeleteTelegramBot($id: ID!) {
    deleteTelegramBot(id: $id)
  }
`;

export const MUTATION_CREATE_TELEGRAM_CHANNEL = `
  mutation CreateTelegramChannel($input: CreateTelegramChannelInput!) {
    createTelegramChannel(input: $input) {
      ${TELEGRAM_CHANNEL_FIELDS}
    }
  }
`;

export const MUTATION_UPDATE_TELEGRAM_CHANNEL = `
  mutation UpdateTelegramChannel($id: ID!, $input: UpdateTelegramChannelInput!) {
    updateTelegramChannel(id: $id, input: $input) {
      ${TELEGRAM_CHANNEL_FIELDS}
    }
  }
`;

export const MUTATION_DELETE_TELEGRAM_CHANNEL = `
  mutation DeleteTelegramChannel($id: ID!) {
    deleteTelegramChannel(id: $id)
  }
`;

export const MUTATION_PUBLISH_CROP_GUIDE_TO_TELEGRAM = `
  mutation PublishCropGuideToTelegram($id: ID!, $channelId: ID) {
    publishCropGuideToTelegram(id: $id, channelId: $channelId) {
      success
      message
      cropGuide {
        ${CROP_GUIDE_ON_TG_FIELDS}
      }
      telegramMessageId
      telegramPostUrl
    }
  }
`;
