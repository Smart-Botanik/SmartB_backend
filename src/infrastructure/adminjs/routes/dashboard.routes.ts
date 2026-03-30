import { Router, Request, Response } from "express";
import { hasPermission } from "../permissions";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminUser } from "../auth.middleware";

export function createDashboardRoutes(
  router: Router,
  prismaService: PrismaService,
) {
  // GET / - Dashboard (with trailing slash)
  router.get("/", async (req: Request, res: Response) => {
    console.log(`📊 Dashboard route: GET /`);
    const currentUser = (req.session as any)?.adminUser as AdminUser;
    try {
      const stats = await getDashboardStats(prismaService!);
      res.render("dashboard/index", {
        currentUser,
        stats,
        hasPermission,
        title: "Dashboard",
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).send("Error loading dashboard");
    }
  });

  // GET /admin - Redirect to /admin/ (for direct access)
  router.get("/admin", (req: Request, res: Response) => {
    console.log(`📊 Dashboard redirect: GET /admin -> /admin/`);
    res.redirect("/admin/");
  });

  return router;
}

// Helper function for dashboard stats
async function getDashboardStats(prismaService: PrismaService) {
  try {
    const [
      userCount,
      plantCount,
      diaryCount,
      brandCount,
      productCount,
      mediaCount,
    ] = await Promise.all([
      prismaService.user.count(),
      prismaService.plant.count(),
      prismaService.diary.count(),
      prismaService.brand.count(),
      prismaService.product.count(),
      prismaService.media.count(),
    ]);

    return {
      users: userCount,
      plants: plantCount,
      diaries: diaryCount,
      brands: brandCount,
      products: productCount,
      media: mediaCount,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      users: 0,
      plants: 0,
      diaries: 0,
      brands: 0,
      products: 0,
      media: 0,
    };
  }
}
