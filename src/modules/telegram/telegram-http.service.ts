import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";
import type { RequestInit as UndiciRequestInit } from "undici";

import {
  resolveTelegramProxyUrl,
  TelegramProxyConfigError,
} from "./telegram-proxy.config";

export type TelegramFetchInit = RequestInit;

@Injectable()
export class TelegramHttpService implements OnModuleInit {
  private readonly logger = new Logger(TelegramHttpService.name);
  private dispatcher: Dispatcher | undefined;
  private proxyUrl: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    try {
      this.proxyUrl = resolveTelegramProxyUrl({
        proxyUrl: this.configService.get<string>("TELEGRAM_PROXY_URL"),
        proxyType: this.configService.get<string>("TELEGRAM_PROXY_TYPE"),
        proxyHost: this.configService.get<string>("TELEGRAM_PROXY_HOST"),
        proxyPort: this.configService.get<string>("TELEGRAM_PROXY_PORT"),
        proxyUser: this.configService.get<string>("TELEGRAM_PROXY_USER"),
        proxyPass: this.configService.get<string>("TELEGRAM_PROXY_PASS"),
      });
    } catch (error) {
      if (error instanceof TelegramProxyConfigError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }

    if (this.proxyUrl) {
      this.dispatcher = new ProxyAgent(this.proxyUrl);
      this.logger.log(
        `Telegram API proxy enabled (${new URL(this.proxyUrl).protocol}//${new URL(this.proxyUrl).host})`,
      );
    }
  }

  isProxyConfigured(): boolean {
    return Boolean(this.proxyUrl);
  }

  async fetch(url: string, init?: TelegramFetchInit): Promise<Response> {
    if (this.dispatcher) {
      const undiciInit: UndiciRequestInit = {
        ...(init as UndiciRequestInit | undefined),
        dispatcher: this.dispatcher,
      };
      return undiciFetch(url, undiciInit) as unknown as Response;
    }

    return fetch(url, init);
  }
}
