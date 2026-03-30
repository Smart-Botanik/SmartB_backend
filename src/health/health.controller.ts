import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiOkResponse({
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2026-03-30T17:36:51.803Z" },
        service: { type: "string", example: "growing-app" },
      },
    },
  })
  @Get("health")
  async health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "growing-app",
    };
  }

  @ApiOperation({ summary: "API health endpoint" })
  @ApiOkResponse({
    description: "API service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2026-03-30T17:36:51.803Z" },
        service: { type: "string", example: "growing-app-api" },
      },
    },
  })
  @Get("api/health")
  async apiHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "growing-app-api",
    };
  }

  @ApiOperation({ summary: "API health check endpoint" })
  @ApiOkResponse({
    description: "API service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2026-03-30T17:36:51.803Z" },
        service: { type: "string", example: "growing-app-api" },
      },
    },
  })
  @Get("api/healthcheck")
  async apiHealthcheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "growing-app-api",
    };
  }
}
