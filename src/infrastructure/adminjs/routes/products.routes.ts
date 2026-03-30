import { Router, Request, Response } from "express";
import { hasPermission } from "../permissions";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminUser } from "../auth.middleware";

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }).single("avatar");

export function createProductRoutes(
  router: Router,
  prismaService: PrismaService,
) {
  // GET /products - List products
  router.get("/products", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "read")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to view products.");
    }

    try {
      const products = await prismaService?.product.findMany({
        include: {
          avatar: true,
          brand: { include: { avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.render("products/list", {
        products: products || [],
        currentUser,
        hasPermission,
        title: "Products",
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Error loading products");
    }
  });

  // GET /products/new - Create product form
  router.get("/products/new", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "create")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to create products.");
    }

    try {
      const brands = await prismaService?.brand.findMany({
        orderBy: { name: "asc" },
      });

      res.render("products/form", {
        currentUser,
        product: null,
        brands: brands || [],
        error: null,
        hasPermission,
        title: "Create Product",
      });
    } catch (error) {
      console.error("Error loading product form:", error);
      res.status(500).send("Error loading product form");
    }
  });

  // GET /products/:id - View product
  router.get("/products/:id", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "read")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to view products.");
    }

    try {
      const product = await prismaService?.product.findUnique({
        where: { id: req.params.id },
        include: {
          avatar: true,
          brand: { include: { avatar: true } },
        },
      });

      if (!product) {
        return res.status(404).send("Product not found");
      }

      res.render("products/view", {
        product,
        currentUser,
        hasPermission,
        title: product.name,
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).send("Error loading product");
    }
  });

  // GET /products/:id/edit - Edit product form
  router.get("/products/:id/edit", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "update")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to edit products.");
    }

    try {
      const [product, brands] = await Promise.all([
        prismaService?.product.findUnique({
          where: { id: req.params.id },
          include: { avatar: true, brand: true },
        }),
        prismaService?.brand.findMany({ orderBy: { name: "asc" } }),
      ]);

      if (!product) {
        return res.status(404).send("Product not found");
      }

      res.render("products/form", {
        currentUser,
        product,
        brands: brands || [],
        error: null,
        hasPermission,
        title: "Edit Product",
      });
    } catch (error) {
      console.error("Error fetching product for edit:", error);
      res.status(500).send("Error loading product");
    }
  });

  // POST /products/new - Create product
  router.post("/products/new", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "create")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to create products.");
    }

    upload(req, res, async (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        const brands = await prismaService?.brand.findMany({
          orderBy: { name: "asc" },
        });
        return res.render("products/form", {
          currentUser,
          product: null,
          brands: brands || [],
          error: "File upload error",
          hasPermission,
          title: "Create Product",
        });
      }

      const { name, category, brandId, summarize } = req.body;
      const avatarFile = (req as any).file;

      if (!name || !brandId) {
        const brands = await prismaService?.brand.findMany({
          orderBy: { name: "asc" },
        });
        return res.render("products/form", {
          currentUser,
          product: null,
          brands: brands || [],
          error: "Product name and brand are required",
          hasPermission,
          title: "Create Product",
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
              key: `products/avatars/${Date.now()}-${avatarFile.originalname}`,
              url: `/uploads/products/avatars/${Date.now()}-${avatarFile.originalname}`,
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
            "products",
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

        await prismaService?.product.create({
          data: {
            name,
            category: category || null,
            brandId,
            summarize: summarize || null,
            avatarMediaId: avatar?.id || null,
          },
        });

        res.redirect("/admin/products");
      } catch (error) {
        console.error("Error creating product:", error);
        const brands = await prismaService?.brand.findMany({
          orderBy: { name: "asc" },
        });
        res.render("products/form", {
          currentUser,
          product: null,
          brands: brands || [],
          error: "Error creating product",
          hasPermission,
          title: "Create Product",
        });
      }
    });
  });

  // POST /products/:id/edit - Update product
  router.post("/products/:id/edit", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "update")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to edit products.");
    }

    upload(req, res, async (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        const [product, brands] = await Promise.all([
          prismaService?.product.findUnique({
            where: { id: req.params.id },
            include: { avatar: true, brand: true },
          }),
          prismaService?.brand.findMany({ orderBy: { name: "asc" } }),
        ]);
        return res.render("products/form", {
          currentUser,
          product,
          brands: brands || [],
          error: "File upload error",
          hasPermission,
          title: "Edit Product",
        });
      }

      const { name, category, brandId, summarize } = req.body;
      const avatarFile = (req as any).file;

      if (!name || !brandId) {
        const [product, brands] = await Promise.all([
          prismaService?.product.findUnique({
            where: { id: req.params.id },
            include: { avatar: true, brand: true },
          }),
          prismaService?.brand.findMany({ orderBy: { name: "asc" } }),
        ]);
        return res.render("products/form", {
          currentUser,
          product,
          brands: brands || [],
          error: "Product name and brand are required",
          hasPermission,
          title: "Edit Product",
        });
      }

      try {
        const product = await prismaService?.product.findUnique({
          where: { id: req.params.id },
          include: { avatar: true },
        });

        if (!product) {
          return res.status(404).send("Product not found");
        }

        let avatar = product.avatar;
        if (avatarFile) {
          // Create new media record for avatar
          avatar = await prismaService?.media.create({
            data: {
              provider: "local",
              bucket: "uploads",
              key: `products/avatars/${Date.now()}-${avatarFile.originalname}`,
              url: `/uploads/products/avatars/${Date.now()}-${avatarFile.originalname}`,
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
            "products",
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

        await prismaService?.product.update({
          where: { id: req.params.id },
          data: {
            name,
            category: category || null,
            brandId,
            summarize: summarize || null,
            avatarMediaId: avatar?.id || null,
          },
        });

        res.redirect(`/admin/products/${req.params.id}`);
      } catch (error) {
        console.error("Error updating product:", error);
        const [product, brands] = await Promise.all([
          prismaService?.product.findUnique({
            where: { id: req.params.id },
            include: { avatar: true, brand: true },
          }),
          prismaService?.brand.findMany({ orderBy: { name: "asc" } }),
        ]);
        res.render("products/form", {
          currentUser,
          product,
          brands: brands || [],
          error: "Error updating product",
          hasPermission,
          title: "Edit Product",
        });
      }
    });
  });

  // POST /products/:id/delete - Delete product
  router.post("/products/:id/delete", async (req: Request, res: Response) => {
    const currentUser = (req.session as any)?.adminUser as AdminUser;

    if (!hasPermission(currentUser, "Product", "delete")) {
      return res
        .status(403)
        .send("Access denied. You don't have permission to delete products.");
    }

    try {
      await prismaService?.product.delete({
        where: { id: req.params.id },
      });

      res.redirect("/admin/products");
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).send("Error deleting product");
    }
  });

  return router;
}
