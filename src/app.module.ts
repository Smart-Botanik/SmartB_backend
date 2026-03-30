import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { GraphQLDateTime } from "graphql-scalars";
import type { Request } from "express";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { MediaModule } from "./modules/media/media.module";
import { PlantModule } from "./modules/plant/plant.module";
import { ProductsModule } from "./modules/products/products.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        typePaths: [
          "node_modules/@growing/contracts/schema/schema.graphql",
          "../packages/contracts/schema/schema.graphql",
        ],
        resolvers: {
          DateTime: GraphQLDateTime,
        },
        context: ({ req }: { req: Request }) => ({ req }),
        playground: configService.get<string>("NODE_ENV") !== "production",
      }),
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PlantModule,
    DiaryModule,
    MediaModule,
    BrandsModule,
    ProductsModule,
  ],
})
export class AppModule {}
