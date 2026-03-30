import { Router, Request, Response } from "express";
import { hasPermission } from "../permissions";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminUser } from "../auth.middleware";

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }).single("avatar");

export function createBrandRoutes(
  router: Router,
  prismaService: PrismaService,
) {
  // GET /brands - List brands
  router.get("/brands", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "read")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to view brands.");
    }

    try {
      const brands = await prismaService?.brand.findMany({
        include: {
          avatar: true,
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.render("brands/list", {
        brands: brands || [],
        currentUser,
        hasPermission,
        title: "Brands",
      });
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).send("Error loading brands");
    }
  });

  // GET /brands/new - Create brand form
  router.get("/brands/new", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "create")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to create brands.");
    }

    try {
      res.render("brands/form", {
        currentUser,
        brand: null,
        error: null,
        hasPermission,
        title: "Create Brand",
      });
    } catch (error) {
      console.error("Error loading brand form:", error);
      res.status(500).send("Error loading brand form");
    }
  });

  // GET /brands/:id - View brand
  router.get("/brands/:id", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "read")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to view brands.");
    }

    try {
      const brand = await prismaService?.brand.findUnique({
        where: { id: req.params.id },
        include: {
          avatar: true,
          products: {
            include: { avatar: true },
            take: 10,
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { products: true } },
        },
      });

      if (!brand) {
        return res.status(404).send("Brand not found");
      }

      res.render("brands/view", {
        brand,
        currentUser,
        hasPermission,
        title: brand.name,
      });
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).send("Error loading brand");
    }
  });

  // GET /brands/:id/edit - Edit brand form
  router.get("/brands/:id/edit", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "update")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to edit brands.");
    }

    try {
      const brand = await prismaService?.brand.findUnique({
        where: { id: req.params.id },
        include: { avatar: true },
      });

      if (!brand) {
        return res.status(404).send("Brand not found");
      }

      res.render("brands/form", {
        currentUser,
        brand,
        error: null,
        hasPermission,
        title: "Edit Brand",
      });
    } catch (error) {
      console.error("Error fetching brand for edit:", error);
      res.status(500).send("Error loading brand");
    }
  });

  // POST /brands/new - Create brand
  router.post("/brands/new", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "create")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to create brands.");
    }

    upload(req, res, async (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        return res.render("brands/form", {
          currentUser,
          brand: null,
          error: "File upload error",
          hasPermission,
          title: "Create Brand",
        });
      }

      const { name, category, summarize } = req.body;
      const avatarFile = (req as any).file;

      if (!name) {
        return res.render("brands/form", {
          currentUser,
          brand: null,
          error: "Brand name is required",
          hasPermission,
          title: "Create Brand",
        });
      }

      try {
        let avatar = null;
        if (avatarFile) {
          // Create media record for avatar
          avatar = await prismaService?.media.create({
            data: {
              provider: "local",
              bucket: "uploads",
              key: `brands/avatars/${Date.now()}-${avatarFile.originalname}`,
              url: `/uploads/brands/avatars/${Date.now()}-${avatarFile.originalname}`,
              mime: avatarFile.mimetype,
              size: avatarFile.size,
            },
          });

          // Save file to disk
          const fs = require("fs");
          const path = require("path");
          const uploadDir = path.join(
            process.cwd(),
            "uploads",
            "brands",
            "avatars",
          );

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          fs.writeFileSync(
            path.join(uploadDir, `${Date.now()}-${avatarFile.originalname}`),
            avatarFile.buffer,
          );
        }

        await prismaService?.brand.create({
          data: {
            name,
            category: category || null,
            summarize: summarize || null,
            avatarMediaId: avatar?.id || null,
          },
        });

        res.redirect("/admin/brands");
      } catch (error) {
        console.error("Error creating brand:", error);
        res.render("brands/form", {
          currentUser,
          brand: null,
          error: "Error creating brand",
          hasPermission,
          title: "Create Brand",
        });
      }
    });
  });

  // POST /brands/:id - Update brand
  router.post("/brands/:id", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "update")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to edit brands.");
    }

    upload(req, res, async (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        const brand = await prismaService?.brand.findUnique({
          where: { id: req.params.id },
          include: { avatar: true },
        });
        return res.render("brands/form", {
          currentUser,
          brand,
          error: "File upload error",
          hasPermission,
          title: "Edit Brand",
        });
      }

      const { name, category, summarize } = req.body;
      const avatarFile = (req as any).file;

      if (!name) {
        const brand = await prismaService?.brand.findUnique({
          where: { id: req.params.id },
          include: { avatar: true },
        });
        return res.render("brands/form", {
          currentUser,
          brand,
          error: "Brand name is required",
          hasPermission,
          title: "Edit Brand",
        });
      }

      try {
        const brand = await prismaService?.brand.findUnique({
          where: { id: req.params.id },
          include: { avatar: true },
        });

        if (!brand) {
          return res.status(404).send("Brand not found");
        }

        let avatar = brand.avatar;
        if (avatarFile) {
          // Create new media record for avatar
          avatar = await prismaService?.media.create({
            data: {
              provider: "local",
              bucket: "uploads",
              key: `brands/avatars/${Date.now()}-${avatarFile.originalname}`,
              url: `/uploads/brands/avatars/${Date.now()}-${avatarFile.originalname}`,
              mime: avatarFile.mimetype,
              size: avatarFile.size,
            },
          });

          // Save file to disk
          const fs = require("fs");
          const path = require("path");
          const uploadDir = path.join(
            process.cwd(),
            "uploads",
            "brands",
            "avatars",
          );

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          fs.writeFileSync(
            path.join(uploadDir, `${Date.now()}-${avatarFile.originalname}`),
            avatarFile.buffer,
          );
        }

        await prismaService?.brand.update({
          where: { id: req.params.id },
          data: {
            name,
            category: category || null,
            summarize: summarize || null,
            avatarMediaId: avatar?.id || null,
          },
        });

        res.redirect(`/admin/brands/${req.params.id}`);
      } catch (error) {
        console.error("Error updating brand:", error);
        const brand = await prismaService?.brand.findUnique({
          where: { id: req.params.id },
          include: { avatar: true },
        });
        res.render("brands/form", {
          currentUser,
          brand,
          error: "Error updating brand",
          hasPermission,
          title: "Edit Brand",
        });
      }
    });
  });

  // DELETE /brands/:id - Delete brand
  router.delete("/brands/:id", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Brand", "delete")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to delete brands.");
    }

    try {
      await prismaService?.brand.delete({
        where: { id: req.params.id },
      });

      res.status(200).send("Brand deleted successfully");
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).send("Error deleting brand");
    }
  });

  return router;
}
