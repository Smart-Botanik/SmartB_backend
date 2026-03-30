import { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { hasPermission } from "./permissions";
import * as path from "path";
import { createAdminRoutes } from "./routes";

export function createAdminRouter(adminJs: any, prismaService?: PrismaService) {
  const express = require("express");
  const router = express.Router();

  // API status endpoint
  router.get("/api/status", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      adminJs: !!adminJs,
      prisma: !!prismaService,
    });
  });

  // Models endpoint for debugging
  router.get("/api/models", (req: Request, res: Response) => {
    if (!prismaService) {
      return res.status(500).json({ error: "Prisma service not available" });
    }

    const models = {
      Product: {
        fields: [
          "id",
          "name",
          "category",
          "brandId",
          "avatarMediaId",
          "summarize",
          "createdAt",
          "updatedAt",
        ],
        relations: ["brand", "avatar"],
      },
      Brand: {
        fields: [
          "id",
          "name",
          "category",
          "avatarMediaId",
          "summarize",
          "createdAt",
          "updatedAt",
        ],
        relations: ["avatar", "products"],
      },
      Media: {
        fields: [
          "id",
          "filename",
          "originalName",
          "mimeType",
          "size",
          "url",
          "folder",
          "createdAt",
          "updatedAt",
        ],
        relations: [],
      },
    };

    res.json(models);
  });

  // Apply nested routes
  if (prismaService) {
    const adminRoutes = createAdminRoutes(prismaService);
    router.use(adminRoutes);
  }

  // Serve static files from uploads directory
  router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // AdminJS integration (if available)
  if (adminJs && adminJs.router) {
    console.log("🔧 Mounting AdminJS router at:", adminJs.options.rootPath);
    router.use(adminJs.options.rootPath, adminJs.router);
  } else if (adminJs) {
    console.log("⚠️ AdminJS instance exists but no router available");
  } else {
    console.log("⚠️ No AdminJS instance available");
  }

  return router;
}
