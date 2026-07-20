import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { MediaRemoteHttpClient } from "./media-remote.http-client";

/**
 * Proxy GET /uploads/* → media-service so clients keep PUBLIC_BASE_URL on BFF :3001.
 */
@Injectable()
export class MediaUploadsProxyMiddleware implements NestMiddleware {
  constructor(private readonly http: MediaRemoteHttpClient) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const pathWithQuery = req.originalUrl || req.url;
    try {
      const upstream = await this.http.proxyRaw(req.method, pathWithQuery);
      res.status(upstream.status);
      const contentType = upstream.headers.get("content-type");
      if (contentType) res.setHeader("content-type", contentType);
      const cacheControl = upstream.headers.get("cache-control");
      if (cacheControl) res.setHeader("cache-control", cacheControl);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (error) {
      next(error);
    }
  }
}
