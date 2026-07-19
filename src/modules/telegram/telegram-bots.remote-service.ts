import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentRemoteGraphqlClient } from "../content/content-remote.graphql-client";
import {
  MUTATION_CREATE_TELEGRAM_BOT,
  MUTATION_CREATE_TELEGRAM_CHANNEL,
  MUTATION_DELETE_TELEGRAM_BOT,
  MUTATION_DELETE_TELEGRAM_CHANNEL,
  MUTATION_UPDATE_TELEGRAM_BOT,
  MUTATION_UPDATE_TELEGRAM_CHANNEL,
  MUTATION_VALIDATE_TELEGRAM_BOT_TOKEN,
  QUERY_TELEGRAM_BOT,
  QUERY_TELEGRAM_BOTS,
  QUERY_TELEGRAM_CHANNEL,
  QUERY_TELEGRAM_CHANNELS,
  QUERY_TELEGRAM_DEFAULT_CHANNEL,
} from "./telegram-remote.operations";
import {
  TelegramBotsService,
  type CreateTelegramBotInput,
  type CreateTelegramChannelInput,
  type UpdateTelegramBotInput,
  type UpdateTelegramChannelInput,
} from "./telegram-bots.service";

/**
 * BFF proxy for Telegram bots/channels → content-service (BK-MS-CONTENT cutover).
 */
@Injectable()
export class TelegramBotsRemoteService extends TelegramBotsService {
  constructor(private readonly remote: ContentRemoteGraphqlClient) {
    super();
  }

  async listBots() {
    const data = await this.remote.execute<{ telegramBots: unknown[] }>(
      QUERY_TELEGRAM_BOTS,
    );
    return data.telegramBots;
  }

  async getBotById(id: string) {
    const data = await this.remote.execute<{ telegramBot: unknown | null }>(
      QUERY_TELEGRAM_BOT,
      { id },
    );
    if (!data.telegramBot) {
      throw new NotFoundException("Telegram bot не найден");
    }
    return data.telegramBot;
  }

  async listChannels(params: { botId?: string; isActive?: boolean }) {
    const data = await this.remote.execute<{ telegramChannels: unknown[] }>(
      QUERY_TELEGRAM_CHANNELS,
      {
        botId: params.botId ?? undefined,
        isActive: params.isActive ?? undefined,
      },
    );
    return data.telegramChannels as Awaited<
      ReturnType<TelegramBotsService["listChannels"]>
    >;
  }

  async getChannelById(id: string) {
    const data = await this.remote.execute<{ telegramChannel: unknown | null }>(
      QUERY_TELEGRAM_CHANNEL,
      { id },
    );
    if (!data.telegramChannel) {
      throw new NotFoundException("Telegram channel не найден");
    }
    return data.telegramChannel as Awaited<
      ReturnType<TelegramBotsService["getChannelById"]>
    >;
  }

  async getDefaultChannel() {
    const data = await this.remote.execute<{
      telegramDefaultChannel: unknown | null;
    }>(QUERY_TELEGRAM_DEFAULT_CHANNEL);
    return data.telegramDefaultChannel as Awaited<
      ReturnType<TelegramBotsService["getDefaultChannel"]>
    >;
  }

  async createBot(input: CreateTelegramBotInput) {
    const data = await this.remote.execute<{ createTelegramBot: unknown }>(
      MUTATION_CREATE_TELEGRAM_BOT,
      { input },
    );
    return data.createTelegramBot;
  }

  async updateBot(id: string, input: UpdateTelegramBotInput) {
    const data = await this.remote.execute<{ updateTelegramBot: unknown }>(
      MUTATION_UPDATE_TELEGRAM_BOT,
      { id, input },
    );
    return data.updateTelegramBot;
  }

  async deleteBot(id: string) {
    const data = await this.remote.execute<{ deleteTelegramBot: boolean }>(
      MUTATION_DELETE_TELEGRAM_BOT,
      { id },
    );
    return data.deleteTelegramBot;
  }

  async createChannel(input: CreateTelegramChannelInput) {
    const data = await this.remote.execute<{ createTelegramChannel: unknown }>(
      MUTATION_CREATE_TELEGRAM_CHANNEL,
      { input },
    );
    return data.createTelegramChannel;
  }

  async updateChannel(id: string, input: UpdateTelegramChannelInput) {
    const data = await this.remote.execute<{ updateTelegramChannel: unknown }>(
      MUTATION_UPDATE_TELEGRAM_CHANNEL,
      { id, input },
    );
    return data.updateTelegramChannel;
  }

  async deleteChannel(id: string) {
    const data = await this.remote.execute<{ deleteTelegramChannel: boolean }>(
      MUTATION_DELETE_TELEGRAM_CHANNEL,
      { id },
    );
    return data.deleteTelegramChannel;
  }

  resolveTokenMasked(tokenEncrypted: string): string {
    if (!tokenEncrypted) return "••••";
    if (tokenEncrypted.includes("•") || tokenEncrypted.startsWith("…")) {
      return tokenEncrypted;
    }
    const last4 = tokenEncrypted.slice(-4);
    return `••••${last4}`;
  }

  async validateBotToken(token: string) {
    const data = await this.remote.execute<{
      validateTelegramBotToken: {
        telegramBotId: string;
        username: string | null;
        firstName: string;
        isBot: boolean;
      };
    }>(MUTATION_VALIDATE_TELEGRAM_BOT_TOKEN, { token });
    return data.validateTelegramBotToken;
  }
}
