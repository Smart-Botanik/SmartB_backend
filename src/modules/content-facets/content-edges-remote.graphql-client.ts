import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GraphqlError = {
  message: string;
  extensions?: {
    code?: string;
    status?: number;
    statusCode?: number;
    originalError?: {
      statusCode?: number;
      error?: string;
    };
  };
};

type GraphqlPayload<TData> = {
  data?: TData;
  errors?: GraphqlError[];
};

function isNotFoundGraphqlError(error: GraphqlError): boolean {
  const status =
    error.extensions?.originalError?.statusCode ??
    error.extensions?.statusCode ??
    error.extensions?.status;
  if (status === 404) {
    return true;
  }
  if (error.extensions?.code === "NOT_FOUND") {
    return true;
  }
  if (error.extensions?.originalError?.error === "Not Found") {
    return true;
  }
  return /not found/i.test(error.message);
}

@Injectable()
export class ContentEdgesRemoteGraphqlClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("CONTENT_EDGES_SERVICE_URL")?.trim());
  }

  async execute<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const baseUrl = this.config.get<string>("CONTENT_EDGES_SERVICE_URL")?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        "CONTENT_EDGES_SERVICE_URL is not configured",
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalKey = this.config
      .get<string>("CONTENT_EDGES_SERVICE_INTERNAL_KEY")
      ?.trim();
    if (internalKey) {
      headers["X-Content-Edges-Internal-Key"] = internalKey;
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
        `Content edges service unavailable at ${baseUrl} (${reason}). Start services/content-edges: npm run dev`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Content edges service HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as GraphqlPayload<TData>;
    if (payload.errors?.length) {
      const message = payload.errors.map(error => error.message).join("; ");
      if (payload.errors.every(isNotFoundGraphqlError)) {
        throw new NotFoundException(message);
      }
      throw new ServiceUnavailableException(message);
    }
    if (!payload.data) {
      throw new ServiceUnavailableException(
        "Content edges service returned empty data",
      );
    }

    return payload.data;
  }
}
