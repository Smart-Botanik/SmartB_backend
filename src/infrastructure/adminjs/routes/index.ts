import { Router } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { createAuthRoutes } from "./auth.routes";
import { createDashboardRoutes } from "./dashboard.routes";
import { createBrandRoutes } from "./brands.routes";
import { createProductRoutes } from "./products.routes";

export function createAdminRoutes(prismaService: PrismaService): Router {
  const router = Router();

  // Apply auth routes
  createAuthRoutes(router, prismaService);

  // Apply dashboard routes
  createDashboardRoutes(router, prismaService);

  // Apply brand routes
  createBrandRoutes(router, prismaService);

  // Apply product routes
  createProductRoutes(router, prismaService);

  return router;
}
