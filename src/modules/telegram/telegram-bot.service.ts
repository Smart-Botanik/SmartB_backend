import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type TelegramApiMessage = {
  message_id: number;
  chat: { id: number | string; username?: string };
};

type TelegramApiResponse = {
  ok: boolean;
  result?: TelegramApiMessage;
  description?: string;
};

@Injectable()
export class TelegramBotService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.getBotToken() && this.getChannelId());
  }

  getBotToken(): string | undefined {
    return this.configService.get<string>("TELEGRAM_BOT_TOKEN")?.trim();
  }

  getChannelId(): string | undefined {
    return this.configService.get<string>("TELEGRAM_CHANNEL_ID")?.trim();
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

  async sendChannelMessage(
    text: string,
    options?: { parseMode?: "HTML" },
  ): Promise<{
    messageId: string;
    postUrl: string;
  }> {
    const token = this.getBotToken();
    const channelId = this.getChannelId();
    if (!token || !channelId) {
      throw new ServiceUnavailableException(
        "Telegram не настроен: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL_ID",
      );
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text,
          ...(options?.parseMode
            ? { parse_mode: options.parseMode }
            : {}),
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
      postUrl: this.buildPostUrl(channelId, payload.result.message_id),
    };
  }
}
