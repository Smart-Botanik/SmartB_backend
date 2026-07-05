import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TelegramBot, TelegramChannel } from "@prisma/client";

import { TelegramBotCredentialsService } from "./telegram-bot-credentials.service";
import { TelegramBotsService } from "./telegram-bots.service";
import { TelegramHttpService } from "./telegram-http.service";

type TelegramApiMessage = {
  message_id: number;
  chat: { id: number | string; username?: string };
};

type TelegramApiResponse = {
  ok: boolean;
  result?: TelegramApiMessage;
  description?: string;
};

export type TelegramSendTarget = {
  token: string;
  chatId: string;
  channelId?: string;
  botId?: string;
  publicUrl?: string | null;
};

export type SendChannelMessageOptions = {
  parseMode?: "HTML";
  channelId?: string;
  botId?: string;
};

type ChannelWithBot = TelegramChannel & { bot: TelegramBot };

@Injectable()
export class TelegramBotService {
  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBots: TelegramBotsService,
    private readonly credentials: TelegramBotCredentialsService,
    private readonly telegramHttp: TelegramHttpService,
  ) {}

  getBotToken(): string | undefined {
    return this.configService.get<string>("TELEGRAM_BOT_TOKEN")?.trim();
  }

  getChannelId(): string | undefined {
    return this.configService.get<string>("TELEGRAM_CHANNEL_ID")?.trim();
  }

  async isConfigured(): Promise<boolean> {
    try {
      await this.resolveSendTarget({});
      return true;
    } catch {
      return false;
    }
  }

  buildPostUrl(channelId: string, messageId: number): string {
    if (channelId.startsWith("@")) {
      return `https://t.me/${channelId.slice(1)}/${messageId}`;
    }
    if (channelId.startsWith("-100")) {
      const internal = channelId.slice(4);
      return `https://t.me/c/${internal}/${messageId}`;
    }
    return `https://t.me/${channelId}/${messageId}`;
  }

  resolvePostUrl(target: TelegramSendTarget, messageId: number): string {
    const publicUrl = target.publicUrl?.trim();
    if (publicUrl) {
      const base = publicUrl.replace(/\/+$/, "");
      if (base.includes("t.me/")) {
        return `${base}/${messageId}`;
      }
    }
    return this.buildPostUrl(target.chatId, messageId);
  }

  private getEnvFallbackTarget(): TelegramSendTarget | null {
    const token = this.getBotToken();
    const chatId = this.getChannelId();
    if (!token || !chatId) {
      return null;
    }
    return { token, chatId };
  }

  private targetFromChannel(channel: ChannelWithBot): TelegramSendTarget {
    if (!channel.isActive) {
      throw new BadRequestException(
        `Канал «${channel.name}» неактивен`,
      );
    }
    if (!channel.bot.isActive) {
      throw new BadRequestException(
        `Бот «${channel.bot.name}» неактивен`,
      );
    }

    return {
      token: this.credentials.decryptToken(channel.bot.tokenEncrypted),
      chatId: channel.chatId,
      channelId: channel.id,
      botId: channel.botId,
      publicUrl: channel.publicUrl,
    };
  }

  async resolveSendTarget(options?: {
    channelId?: string;
    botId?: string;
  }): Promise<TelegramSendTarget> {
    const channelId = options?.channelId?.trim();
    const botId = options?.botId?.trim();

    if (channelId) {
      return this.targetFromChannel(
        await this.telegramBots.getChannelById(channelId),
      );
    }

    if (botId) {
      const channels = await this.telegramBots.listChannels({
        botId,
        isActive: true,
      });
      const channel =
        channels.find(item => item.isDefault) ?? channels[0] ?? null;
      if (!channel) {
        throw new BadRequestException(
          "У бота нет активных каналов для публикации",
        );
      }
      return this.targetFromChannel(channel);
    }

    const defaultChannel = await this.telegramBots.getDefaultChannel();
    if (defaultChannel) {
      return this.targetFromChannel(defaultChannel);
    }

    const envTarget = this.getEnvFallbackTarget();
    if (envTarget) {
      return envTarget;
    }

    throw new ServiceUnavailableException(
      "Telegram не настроен: добавьте бота и канал в админке или задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL_ID",
    );
  }

  async sendChannelMessage(
    text: string,
    options?: SendChannelMessageOptions,
  ): Promise<{
    messageId: string;
    postUrl: string;
    channelId?: string;
    botId?: string;
  }> {
    const target = await this.resolveSendTarget({
      channelId: options?.channelId,
      botId: options?.botId,
    });

    const response = await this.telegramHttp.fetch(
      `https://api.telegram.org/bot${target.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: target.chatId,
          text,
          ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
          disable_web_page_preview: false,
        }),
      },
    );

    const payload = (await response.json()) as TelegramApiResponse;
    if (!payload.ok || !payload.result) {
      throw new ServiceUnavailableException(
        payload.description ?? "Telegram API: sendMessage failed",
      );
    }

    const messageId = String(payload.result.message_id);
    return {
      messageId,
      postUrl: this.resolvePostUrl(target, payload.result.message_id),
      channelId: target.channelId,
      botId: target.botId,
    };
  }
}
