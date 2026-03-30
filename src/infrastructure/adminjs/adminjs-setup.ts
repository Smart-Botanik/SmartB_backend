import { Request, Response, NextFunction } from "express";
import { createAdminRouter } from "./express-router";
import { PrismaService } from "../prisma/prisma.service";
import { createAuthMiddleware, AdminUser } from "./auth.middleware";
import {
  getUserResourcePermissions,
  hasPermission,
  canAccessResource,
  getAvailableActions,
} from "./permissions";
import * as path from "path";
import * as express from "express";
const session = require("express-session");
const ejsLayouts = require("express-ejs-layouts");

export async function setupAdminJS(app: any) {
  try {
    console.log("🔧 Setting up AdminJS...");

    // Get PrismaService from the app container
    const prismaService = app.get(PrismaService);

    const AdminJS = require("adminjs").default || require("adminjs");
    console.log("✅ AdminJS imported successfully");

    // Try to import Prisma adapter
    let prismaAdapter: any = null;
    try {
      // Dynamic import to avoid TypeScript module resolution issues
      prismaAdapter = require("@adminjs/prisma");
      console.log("✅ Prisma adapter imported");
    } catch (err) {
      console.log("⚠️ Prisma adapter not available, using basic setup:", err);
    }

    const adminJs = new AdminJS({
      branding: {
        companyName: "Growing App Admin",
        logo: "",
      },
      rootPath: "/admin",
      resources: prismaAdapter ? [] : [], // Will be configured with Prisma resources
    });

    console.log("✅ AdminJS instance created");

    // Get the underlying Express instance
    const expressApp = app.getHttpAdapter().getInstance();

    // Configure EJS Layouts middleware
    expressApp.use(ejsLayouts);

    // Configure EJS template engine
    const templatesPath =
      process.env.NODE_ENV === "production"
        ? path.join(__dirname, "templates")
        : path.join(
            process.cwd(),
            "src",
            "infrastructure",
            "adminjs",
            "templates",
          );

    expressApp.set("view engine", "ejs");
    expressApp.set("views", templatesPath);
    // Set default layout
    expressApp.set("layout", "layout/admin");
    console.log("🎨 EJS template engine configured at:", templatesPath);

    // Configure session middleware
    expressApp.use(
      session({
        secret: process.env.SESSION_SECRET || "change-this-session-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: null, // Indefinite session for development
        },
      }),
    );

    // Create authentication middleware
    const authMiddleware = createAuthMiddleware(prismaService);

    // Apply authentication to all admin routes first
    expressApp.use("/admin", authMiddleware);

    // Mount custom admin routes with Brand CRUD (includes auth routes)
    const adminRouter = createAdminRouter(null, prismaService);
    console.log("🔧 Mounting admin routes at /admin");
    expressApp.use("/admin", adminRouter);

    // Try to build the router with proper configuration
    try {
      // Import express adapter dynamically
      const expressAdapter = await import("@adminjs/express");

      if (expressAdapter.buildRouter) {
        const router = expressAdapter.buildRouter(adminJs);
        expressApp.use(adminJs.options.rootPath, router);
        console.log(
          "✅ Full AdminJS router mounted at:",
          adminJs.options.rootPath,
        );
      } else {
        // Fallback to custom setup but with AdminJS integration
        setupAdminJSWithCustomUI(expressApp, adminJs, prismaService);
      }
    } catch (adapterError) {
      console.log(
        "⚠️ Express adapter not available, using custom AdminJS setup",
      );
      setupAdminJSWithCustomUI(expressApp, adminJs, prismaService);
    }

    console.log(
      "🔧 AdminJS with authentication available at: http://localhost:3001/admin",
    );
  } catch (error) {
    console.error("❌ Failed to setup AdminJS:", (error as Error).message);
    console.error("❌ Full error:", error);
  }
}

function setupAdminJSWithCustomUI(
  expressApp: any,
  adminJs: any,
  prismaService: PrismaService,
) {
  // Setup admin route that renders AdminJS UI instead of custom HTML
  expressApp.use(
    adminJs.options.rootPath,
    async (req: Request, res: Response, next: NextFunction) => {
      // If it's the root admin path, render AdminJS dashboard
      if (req.path === "/" || req.path === "") {
        const currentUser = (req.session as any)?.adminUser;

        // Generate AdminJS HTML with authentication context
        const adminJsHtml = await generateAdminJSHTML(
          adminJs,
          currentUser,
          prismaService,
        );
        res.send(adminJsHtml);
      } else {
        // For other admin paths, continue to next middleware
        next();
      }
    },
  );

  console.log("✅ AdminJS with custom UI mounted at /admin");
}

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

async function generateAdminJSHTML(
  adminJs: any,
  currentUser: any,
  prismaService: PrismaService,
): Promise<string> {
  // Get real statistics from database
  const stats = await getDashboardStats(prismaService);
  const permissions = getUserResourcePermissions(currentUser);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AdminJS - Growing App Admin</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          background: #f8f9fa;
          min-height: 100vh;
        }
        .admin-header { 
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white; 
          padding: 20px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .admin-logo { 
          font-size: 24px; 
          font-weight: 700; 
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .user-details {
          text-align: right;
        }
        .user-name {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .user-email {
          font-size: 12px;
          opacity: 0.8;
        }
        .logout-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 8px 16px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 12px;
          transition: background 0.2s ease;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 73px;
          width: 250px;
          height: calc(100vh - 73px);
          background: white;
          border-right: 1px solid #e1e8ed;
          overflow-y: auto;
        }
        .sidebar-item {
          padding: 12px 20px;
          border-bottom: 1px solid #f1f3f4;
          color: #2c3e50;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.2s ease;
        }
        .sidebar-item:hover {
          background: #f8f9fa;
        }
        .sidebar-item.active {
          background: #e3f2fd;
          color: #1976d2;
          border-left: 3px solid #1976d2;
        }
        .admin-content {
          margin-left: 250px;
          padding: 30px;
        }
        .content-header {
          margin-bottom: 30px;
        }
        .content-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        .content-subtitle {
          color: #6c757d;
          font-size: 16px;
        }
        .resource-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .resource-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e1e8ed;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .resource-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .resource-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }
        .resource-name {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        .resource-description {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .resource-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .action-btn.primary {
          background: #007bff;
          color: white;
        }
        .action-btn.primary:hover {
          background: #0056b3;
        }
        .action-btn.secondary {
          background: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
        }
        .action-btn.secondary:hover {
          background: #e9ecef;
        }
        .stats-container {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e1e8ed;
          margin-bottom: 30px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .stat-icon {
          font-size: 24px;
          opacity: 0.7;
        }
        .stat-label {
          color: #6c757d;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="admin-header">
        <div class="admin-logo">
          🌱 Growing App Admin
        </div>
        <div class="user-info">
          <div class="user-details">
            <div class="user-name">${currentUser?.username || "Admin User"} (${currentUser?.role || "USER"})</div>
            <div class="user-email">${currentUser?.email || "admin@example.com"}</div>
          </div>
          <a href="/admin/logout" class="logout-btn">Logout</a>
        </div>
      </div>

      <div class="admin-sidebar">
        <a href="/admin" class="sidebar-item active">
          📊 Dashboard
        </a>
        ${
          permissions.User?.read
            ? `
        <a href="/admin/users" class="sidebar-item">
          👥 Users
        </a>
        `
            : ""
        }
        ${
          permissions.Plant?.read
            ? `
        <a href="/admin/plants" class="sidebar-item">
          🌿 Plants
        </a>
        `
            : ""
        }
        ${
          permissions.Diary?.read
            ? `
        <a href="/admin/diaries" class="sidebar-item">
          📝 Diaries
        </a>
        `
            : ""
        }
        ${
          permissions.Brand?.read
            ? `
        <a href="/admin/brands" class="sidebar-item">
          🏷️ Brands
        </a>
        `
            : ""
        }
        ${
          permissions.Product?.read
            ? `
        <a href="/admin/products" class="sidebar-item">
          📦 Products
        </a>
        `
            : ""
        }
        ${
          permissions.Media?.read
            ? `
        <a href="/admin/media" class="sidebar-item">
          🖼️ Media
        </a>
        `
            : ""
        }
      </div>

      <div class="admin-content">
        <div class="content-header">
          <h1 class="content-title">Dashboard</h1>
          <p class="content-subtitle">Manage your Growing App data and settings</p>
        </div>

        <div class="stats-container">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">
                <span class="stat-icon">👥</span>
                ${stats.users}
              </div>
              <div class="stat-label">Users</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                <span class="stat-icon">🌿</span>
                ${stats.plants}
              </div>
              <div class="stat-label">Plants</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                <span class="stat-icon">📝</span>
                ${stats.diaries}
              </div>
              <div class="stat-label">Diaries</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                <span class="stat-icon">📦</span>
                ${stats.products}
              </div>
              <div class="stat-label">Products</div>
            </div>
          </div>
        </div>

        <div class="resource-grid">
          ${
            permissions.User?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">👥</div>
            <div class="resource-name">Users</div>
            <div class="resource-description">Manage ${stats.users} user accounts and permissions</div>
            <div class="resource-actions">
              <a href="/admin/users" class="action-btn primary">View All</a>
              ${permissions.User?.create ? '<a href="/admin/users/new" class="action-btn secondary">Add New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }

          ${
            permissions.Plant?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">🌿</div>
            <div class="resource-name">Plants</div>
            <div class="resource-description">Manage ${stats.plants} plant information and growing data</div>
            <div class="resource-actions">
              <a href="/admin/plants" class="action-btn primary">View All</a>
              ${permissions.Plant?.create ? '<a href="/admin/plants/new" class="action-btn secondary">Add New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }

          ${
            permissions.Diary?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">📝</div>
            <div class="resource-name">Diaries</div>
            <div class="resource-description">Manage ${stats.diaries} diary entries and user journals</div>
            <div class="resource-actions">
              <a href="/admin/diaries" class="action-btn primary">View All</a>
              ${permissions.Diary?.create ? '<a href="/admin/diaries/new" class="action-btn secondary">Add New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }

          ${
            permissions.Brand?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">🏷️</div>
            <div class="resource-name">Brands</div>
            <div class="resource-description">Manage ${stats.brands} product brands and manufacturers</div>
            <div class="resource-actions">
              <a href="/admin/brands" class="action-btn primary">View All</a>
              ${permissions.Brand?.create ? '<a href="/admin/brands/new" class="action-btn secondary">Add New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }

          ${
            permissions.Product?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">📦</div>
            <div class="resource-name">Products</div>
            <div class="resource-description">Manage ${stats.products} product catalog and inventory</div>
            <div class="resource-actions">
              <a href="/admin/products" class="action-btn primary">View All</a>
              ${permissions.Product?.create ? '<a href="/admin/products/new" class="action-btn secondary">Add New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }

          ${
            permissions.Media?.read
              ? `
          <div class="resource-card">
            <div class="resource-icon">🖼️</div>
            <div class="resource-name">Media</div>
            <div class="resource-description">Manage ${stats.media} uploaded images and files</div>
            <div class="resource-actions">
              <a href="/admin/media" class="action-btn primary">View All</a>
              ${permissions.Media?.create ? '<a href="/admin/media/new" class="action-btn secondary">Upload New</a>' : ""}
            </div>
          </div>
          `
              : ""
          }
        </div>
      </div>
    </body>
    </html>
  `;
}
