import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GraphqlPayload<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

@Injectable()
export class TaxonomyRemoteGraphqlClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("TAXONOMY_SERVICE_URL")?.trim());
  }

  async execute<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const baseUrl = this.config.get<string>("TAXONOMY_SERVICE_URL")?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException("TAXONOMY_SERVICE_URL is not configured");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalKey = this.config
      .get<string>("TAXONOMY_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-Taxonomy-Internal-Key"] = internalKey;
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
        `Taxonomy service unavailable at ${baseUrl} (${reason}). Start services/taxonomy: npm run dev`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Taxonomy service HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as GraphqlPayload<TData>;
    if (payload.errors?.length) {
      throw new ServiceUnavailableException(
        payload.errors.map(error => error.message).join("; "),
      );
    }
    if (!payload.data) {
      throw new ServiceUnavailableException("Taxonomy service returned empty data");
    }

    return payload.data;
  }
}
