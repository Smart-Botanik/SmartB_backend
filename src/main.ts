import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>("NODE_ENV") ?? "development";

  // Allow local frontend origins (localhost, 127.0.0.1 and LAN IPs in dev).
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isLocalhost =
        /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin);
      const isLanDev = /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/i.test(
        origin,
      );

      if (isLocalhost || (nodeEnv !== "production" && isLanDev)) {
        callback(null, origin);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  // Add body-parser middleware for form data and file uploads
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

  const port = configService.get<number>("PORT") ?? 3001;

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SmartБотаник API")
    .setDescription("Backend API SmartБотаник (Nest.js)")
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

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📁 Serving uploads from: ${uploadsDir}`);
}

bootstrap();
