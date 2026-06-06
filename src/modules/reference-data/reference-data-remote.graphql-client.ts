import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GraphqlPayload<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

@Injectable()
export class ReferenceDataRemoteGraphqlClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("REFERENCE_DATA_SERVICE_URL")?.trim());
  }

  async execute<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const baseUrl = this.config.get<string>("REFERENCE_DATA_SERVICE_URL")?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        "REFERENCE_DATA_SERVICE_URL is not configured",
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalKey = this.config
      .get<string>("REFERENCE_DATA_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-Reference-Data-Internal-Key"] = internalKey;
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Reference data service HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as GraphqlPayload<TData>;
    if (payload.errors?.length) {
      throw new ServiceUnavailableException(
        payload.errors.map(error => error.message).join("; "),
      );
    }
    if (!payload.data) {
      throw new ServiceUnavailableException(
        "Reference data service returned empty data",
      );
    }

    return payload.data;
  }
}
