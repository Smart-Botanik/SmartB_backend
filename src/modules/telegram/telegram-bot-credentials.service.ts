import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  decryptTelegramSecret,
  encryptTelegramSecret,
  maskTelegramToken,
  resolveTelegramEncryptionKey,
  TelegramCryptoError,
  tokenHintLast4,
} from "./telegram-crypto";
import { TelegramHttpService } from "./telegram-http.service";

export type TelegramGetMeResult = {
  id: number;
  username?: string;
  firstName: string;
  isBot: boolean;
};

type TelegramApiGetMeResponse = {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  description?: string;
};

@Injectable()
export class TelegramBotApiService {
  constructor(private readonly telegramHttp: TelegramHttpService) {}

  async getMe(token: string): Promise<TelegramGetMeResult> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new BadRequestException("Bot token не задан");
    }

    const response = await this.telegramHttp.fetch(
      `https://api.telegram.org/bot${trimmed}/getMe`,
    );
    const payload = (await response.json()) as TelegramApiGetMeResponse;

    if (!payload.ok || !payload.result) {
      throw new BadRequestException(
        payload.description ?? "Telegram API: getMe failed",
      );
    }

    if (!payload.result.is_bot) {
      throw new BadRequestException("Token не принадлежит bot-аккаунту");
    }

    return {
      id: payload.result.id,
      username: payload.result.username,
      firstName: payload.result.first_name,
      isBot: payload.result.is_bot,
    };
  }
}

@Injectable()
export class TelegramBotCredentialsService {
  private encryptionKey: Buffer | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBotApi: TelegramBotApiService,
  ) {}

  isEncryptionConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("TELEGRAM_TOKEN_ENCRYPTION_KEY")?.trim(),
    );
  }

  encryptToken(plainToken: string): {
    tokenEncrypted: string;
    tokenHintLast4: string;
    maskedToken: string;
  } {
    const key = this.getEncryptionKey();
    try {
      const tokenEncrypted = encryptTelegramSecret(plainToken.trim(), key);
      const hint = tokenHintLast4(plainToken);
      return {
        tokenEncrypted,
        tokenHintLast4: hint,
        maskedToken: maskTelegramToken(hint),
      };
    } catch (error) {
      if (error instanceof TelegramCryptoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  decryptToken(tokenEncrypted: string): string {
    const key = this.getEncryptionKey();
    try {
      return decryptTelegramSecret(tokenEncrypted, key);
    } catch (error) {
      if (error instanceof TelegramCryptoError) {
        throw new ServiceUnavailableException(
          "Не удалось расшифровать bot token",
        );
      }
      throw error;
    }
  }

  maskStoredToken(tokenEncrypted: string): string {
    try {
      const plain = this.decryptToken(tokenEncrypted);
      return maskTelegramToken(tokenHintLast4(plain));
    } catch {
      return "***";
    }
  }

  async validatePlainToken(plainToken: string): Promise<TelegramGetMeResult> {
    return this.telegramBotApi.getMe(plainToken);
  }

  async encryptAndValidateToken(plainToken: string): Promise<{
    tokenEncrypted: string;
    tokenHintLast4: string;
    maskedToken: string;
    username?: string;
    telegramBotId: number;
  }> {
    const me = await this.validatePlainToken(plainToken);
    const encrypted = this.encryptToken(plainToken);
    return {
      ...encrypted,
      username: me.username,
      telegramBotId: me.id,
    };
  }

  private getEncryptionKey(): Buffer {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      this.encryptionKey = resolveTelegramEncryptionKey(
        this.configService.get<string>("TELEGRAM_TOKEN_ENCRYPTION_KEY"),
      );
      return this.encryptionKey;
    } catch (error) {
      if (error instanceof TelegramCryptoError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }
}
