import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import {
  hasPermission,
  canAccessResource,
  getAvailableActions,
} from "./permissions";

declare module "express-session" {
  interface SessionData {
    adminUser?: AdminUser;
  }
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function createAuthMiddleware(prismaService: PrismaService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔍 Auth middleware: ${req.method} ${req.path}`);

    // Skip authentication for API status endpoints
    if (req.path.startsWith("/api/") && req.path !== "/admin/api/login") {
      return next();
    }

    // Check if user is already authenticated via session
    if (req.session && req.session.adminUser) {
      console.log(
        `🔑 Auth middleware: user already authenticated: ${req.session.adminUser.email}`,
      );

      // If trying to access login page while authenticated, redirect to dashboard
      if (req.path === "/login") {
        console.log(
          "🔄 Auth middleware: redirecting authenticated user from /login to /admin",
        );
        return res.redirect("/admin");
      }

      // Add permission helpers to the request object
      (req as any).hasPermission = (resource: string, action: string) =>
        hasPermission(req.session!.adminUser!, resource, action as any);

      (req as any).canAccessResource = (resource: string) =>
        canAccessResource(req.session!.adminUser!, resource);

      (req as any).getAvailableActions = (resource: string) =>
        getAvailableActions(req.session!.adminUser!, resource);

      return next();
    }

    // For login and logout pages, allow access
    if (req.path === "/login" || req.path === "/logout") {
      console.log(`🔓 Auth middleware: allowing access to ${req.path}`);
      return next();
    }

    // Redirect to login if not authenticated
    return res.redirect("/admin/login");
  };
}

export async function authenticateAdmin(
  email: string,
  password: string,
  prismaService: PrismaService,
): Promise<AdminUser | null> {
  try {
    const user = await prismaService.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN") {
      return null;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export function createLoginRouter(prismaService: PrismaService) {
  const express = require("express");
  const router = express.Router();

  // Login page
  router.get("/login", (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Login - Growing App</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .login-container { 
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 90%;
            max-width: 400px;
            overflow: hidden;
          }
          .login-header { 
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white; 
            padding: 30px;
            text-align: center;
          }
          .login-logo { 
            font-size: 24px; 
            font-weight: 700; 
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }
          .login-subtitle { 
            opacity: 0.9; 
            font-size: 14px;
            font-weight: 400;
          }
          .login-body { 
            padding: 40px 30px;
          }
          .form-group { 
            margin-bottom: 20px; 
          }
          .form-label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 500; 
            color: #2c3e50;
            font-size: 14px;
          }
          .form-input { 
            width: 100%; 
            padding: 12px 16px; 
            border: 2px solid #e1e8ed; 
            border-radius: 8px; 
            font-size: 16px;
            transition: border-color 0.2s ease;
          }
          .form-input:focus { 
            outline: none; 
            border-color: #667eea; 
          }
          .login-button { 
            width: 100%; 
            padding: 14px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .login-button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }
          .error-message { 
            background: #f8d7da; 
            color: #721c24; 
            padding: 12px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border: 1px solid #f5c6cb;
            font-size: 14px;
          }
          .info-message { 
            background: #d1ecf1; 
            color: #0c5460; 
            padding: 12px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border: 1px solid #bee5eb;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <div class="login-header">
            <div class="login-logo">
              🔐 Admin Login
            </div>
            <div class="login-subtitle">Growing App Administration</div>
          </div>
          
          <div class="login-body">
            <div class="info-message">
              Please login with your admin credentials to access the dashboard.
            </div>
            
            <form method="POST" action="/admin/login">
              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input type="email" id="email" name="email" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input type="password" id="password" name="password" class="form-input" required>
              </div>
              
              <button type="submit" class="login-button">Sign In</button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Handle login POST
  router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Error - Growing App</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background: #f8f9fa; padding: 20px; }
            .error-container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error-message { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #f5c6cb; }
            .back-button { display: inline-block; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-message">Email and password are required.</div>
            <a href="/admin/login" class="back-button">← Back to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    const adminUser = await authenticateAdmin(email, password, prismaService);

    if (!adminUser) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Error - Growing App</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background: #f8f9fa; padding: 20px; }
            .error-container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error-message { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #f5c6cb; }
            .back-button { display: inline-block; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-message">Invalid email or password. Please try again.</div>
            <a href="/admin/login" class="back-button">← Back to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    // Set session
    req.session.adminUser = adminUser;
    res.redirect("/admin");
  });

  // Logout
  router.get("/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect("/admin/login");
    });
  });

  return router;
}
