import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MediaRemoteHttpClient {
  constructor(private readonly config: ConfigService) {}

  baseUrl(): string {
    const url = this.config.get<string>("MEDIA_SERVICE_URL")?.trim();
    if (!url) {
      throw new ServiceUnavailableException(
        "MEDIA_SERVICE_URL is not configured",
      );
    }
    return url.replace(/\/$/, "");
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...(extra ?? {}) };
    const internalKey = this.config
      .get<string>("MEDIA_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-Media-Internal-Key"] = internalKey;
    }
    return headers;
  }

  async requestJson<T>(
    method: string,
    path: string,
    init?: { body?: BodyInit; headers?: Record<string, string> },
  ): Promise<T> {
    const url = `${this.baseUrl()}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: this.headers(init?.headers),
        body: init?.body,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Media service unavailable at ${this.baseUrl()} (${reason}). Start services/media: npm run dev`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 400) {
        throw new BadRequestException(text || `Media service HTTP 400`);
      }
      throw new ServiceUnavailableException(
        `Media service HTTP ${response.status}${text ? `: ${text}` : ""}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async proxyRaw(
    method: string,
    pathWithQuery: string,
    init?: {
      body?: BodyInit | null;
      headers?: Record<string, string>;
    },
  ): Promise<Response> {
    const url = `${this.baseUrl()}${pathWithQuery}`;
    try {
      return await fetch(url, {
        method,
        headers: this.headers(init?.headers),
        body: init?.body ?? undefined,
        redirect: "manual",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Media service unavailable at ${this.baseUrl()} (${reason})`,
      );
    }
  }
}
