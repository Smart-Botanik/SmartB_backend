import { Router, Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminUser } from "../auth.middleware";
import * as bcrypt from "bcrypt";

export function createAuthRoutes(router: Router, prismaService: PrismaService) {
  // GET /login - Login page
  router.get("/login", (req: Request, res: Response) => {
    console.log("🔐 Auth route: GET /login");
    res.render("auth/login", {
      error: null,
      title: "Login",
    });
  });

  // POST /login - Handle login
  router.post("/login", async (req: Request, res: Response) => {
    console.log("🔐 Auth route: POST /login");
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("auth/login", {
        error: "Email and password are required",
        title: "Login",
      });
    }

    try {
      console.log(`🔍 Looking for user with email: ${email}`);
      // Find user by email
      const user = await prismaService?.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log(`❌ User not found: ${email}`);
        return res.render("auth/login", {
          error: "Invalid email or password",
          title: "Login",
        });
      }

      console.log(`✅ User found: ${user.email}, role: ${user.role}`);

      // Check if user has admin role
      if (user.role !== "ADMIN") {
        console.log(`❌ User role is not ADMIN: ${user.role}`);
        return res.render("auth/login", {
          error: "Access denied. Admin access required.",
          title: "Login",
        });
      }

      // Check password using bcrypt
      console.log(`🔐 Checking password for user: ${user.email}`);
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`❌ Invalid password for user: ${user.email}`);
        return res.render("auth/login", {
          error: "Invalid email or password",
          title: "Login",
        });
      }

      console.log(`✅ Password valid for user: ${user.email}`);

      // Create admin user session
      (req.session as any).adminUser = {
        id: user.id,
        email: user.email,
        username: user.username || user.email,
        role: user.role,
      };

      res.redirect("/admin");
    } catch (error) {
      console.error("Login error:", error);
      res.render("auth/login", {
        error: "An error occurred during login",
        title: "Login",
      });
    }
  });

  // POST /logout - Handle logout
  router.post("/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/admin/login");
    });
  });

  // GET /logout - Handle logout (GET for convenience)
  router.get("/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/admin/login");
    });
  });

  return router;
}
