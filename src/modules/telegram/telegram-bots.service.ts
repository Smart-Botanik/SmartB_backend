import { Injectable } from "@nestjs/common";

export type CreateTelegramBotInput = {
  name: string;
  token: string;
  isActive?: boolean | null;
};

export type UpdateTelegramBotInput = {
  name?: string | null;
  token?: string | null;
  isActive?: boolean | null;
};

export type CreateTelegramChannelInput = {
  name: string;
  chatId: string;
  botId: string;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  publicUrl?: string | null;
};

export type UpdateTelegramChannelInput = {
  name?: string | null;
  chatId?: string | null;
  botId?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  publicUrl?: string | null;
};

/** DI token; runtime: {@link TelegramBotsRemoteService} (BK-MS-CONTENT cutover). */
@Injectable()
export abstract class TelegramBotsService {
  abstract listBots(): Promise<unknown[]>;

  abstract getBotById(id: string): Promise<unknown>;

  abstract listChannels(params: {
    botId?: string;
    isActive?: boolean;
  }): Promise<
    Array<{
      id: string;
      name: string;
      isDefault: boolean;
      isActive: boolean;
      chatId: string;
      botId: string;
      publicUrl?: string | null;
      bot: {
        id: string;
        name: string;
        isActive: boolean;
        tokenEncrypted?: string;
        tokenMasked?: string;
      };
      [key: string]: unknown;
    }>
  >;

  abstract getChannelById(id: string): Promise<{
    id: string;
    name: string;
    chatId: string;
    botId: string;
    isDefault: boolean;
    isActive: boolean;
    publicUrl?: string | null;
    bot: {
      id: string;
      name: string;
      isActive: boolean;
      tokenEncrypted?: string;
      tokenMasked?: string;
    };
    [key: string]: unknown;
  }>;

  abstract getDefaultChannel(): Promise<{
    id: string;
    name: string;
    chatId: string;
    botId: string;
    isDefault: boolean;
    isActive: boolean;
    publicUrl?: string | null;
    bot: {
      id: string;
      name: string;
      isActive: boolean;
      tokenEncrypted?: string;
      tokenMasked?: string;
    };
    [key: string]: unknown;
  } | null>;

  abstract createBot(input: CreateTelegramBotInput): Promise<unknown>;

  abstract updateBot(
    id: string,
    input: UpdateTelegramBotInput,
  ): Promise<unknown>;

  abstract deleteBot(id: string): Promise<boolean>;

  abstract createChannel(input: CreateTelegramChannelInput): Promise<unknown>;

  abstract updateChannel(
    id: string,
    input: UpdateTelegramChannelInput,
  ): Promise<unknown>;

  abstract deleteChannel(id: string): Promise<boolean>;

  abstract resolveTokenMasked(tokenEncrypted: string): string;

  abstract validateBotToken(token: string): Promise<{
    telegramBotId: string;
    username: string | null;
    firstName: string;
    isBot: boolean;
  }>;
}
