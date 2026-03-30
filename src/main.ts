import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { AppModule } from "./app.module";
import { setupAdminJS } from "./infrastructure/adminjs/adminjs-setup";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  });

  // Add body-parser middleware for AdminJS login form
  app.use(require("express").json());
  app.use(require("express").urlencoded({ extended: true }));

  // Serve static files from uploads directory
  const uploadsDir = join(process.cwd(), "uploads");
  app.use("/uploads", require("express").static(uploadsDir));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") ?? 3001;

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Growing App API")
    .setDescription("Backend API (Nest.js)")
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  // Setup AdminJS
  await setupAdminJS(app);

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📁 Serving uploads from: ${uploadsDir}`);
}

bootstrap();
