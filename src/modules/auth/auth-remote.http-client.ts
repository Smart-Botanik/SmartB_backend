import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthRemoteHttpClient {
  constructor(private readonly config: ConfigService) {}

  baseUrl(): string {
    const url = this.config.get<string>("AUTH_SERVICE_URL")?.trim();
    if (!url) {
      throw new ServiceUnavailableException(
        "AUTH_SERVICE_URL is not configured",
      );
    }
    return url.replace(/\/$/, "");
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extra ?? {}),
    };
    const internalKey = this.config
      .get<string>("AUTH_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-Auth-Internal-Key"] = internalKey;
    }
    return headers;
  }

  async requestJson<T>(
    method: string,
    path: string,
    init?: {
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    let pathWithQuery = path;
    if (init?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) {
        pathWithQuery = `${path}?${qs}`;
      }
    }

    const url = `${this.baseUrl()}${pathWithQuery}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: this.headers(init?.headers),
        body:
          init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Auth service unavailable at ${this.baseUrl()} (${reason}). Start services/auth: npm run dev`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let message = text;
      try {
        const parsed = JSON.parse(text) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) {
          message = parsed.message.join(", ");
        } else if (parsed.message) {
          message = parsed.message;
        }
      } catch {
        // keep raw text
      }

      if (response.status === 400) {
        throw new BadRequestException(message || "Auth service HTTP 400");
      }
      if (response.status === 401) {
        throw new UnauthorizedException(message || "Unauthorized");
      }
      if (response.status === 403) {
        throw new ForbiddenException(message || "Forbidden");
      }
      if (response.status === 404) {
        throw new NotFoundException(message || "Not found");
      }
      if (response.status === 409) {
        throw new ConflictException(message || "Conflict");
      }
      throw new ServiceUnavailableException(
        `Auth service HTTP ${response.status}${message ? `: ${message}` : ""}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
