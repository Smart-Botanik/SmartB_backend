import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GraphqlPayload<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

@Injectable()
export class UserRemoteGraphqlClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("USER_SERVICE_URL")?.trim());
  }

  async execute<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const baseUrl = this.config.get<string>("USER_SERVICE_URL")?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        "USER_SERVICE_URL is not configured",
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalKey = this.config
      .get<string>("USER_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-User-Internal-Key"] = internalKey;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `User service unavailable at ${baseUrl} (${reason}). Start services/user: npm run dev`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `User service HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as GraphqlPayload<TData>;
    if (payload.errors?.length) {
      throw new ServiceUnavailableException(
        payload.errors.map((error) => error.message).join("; "),
      );
    }
    if (!payload.data) {
      throw new ServiceUnavailableException(
        "User service returned empty data",
      );
    }

    return payload.data;
  }
}
