import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import type { Request } from "express";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { EventsModule } from "./modules/events/events.module";
import { MediaModule } from "./modules/media/media.module";
import { PlantModule } from "./modules/plant/plant.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { ProductsModule } from "./modules/products/products.module";
import { TagsModule } from "./modules/tags/tags.module";
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
          "../packages/contracts/schema/schema.graphql",
          "node_modules/@growing/contracts/schema/schema.graphql",
        ],
        resolvers: {
          DateTime: GraphQLDateTime,
          JSON: GraphQLJSON,
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
    EventsModule,
    MediaModule,
    BrandsModule,
    ProductsModule,
    LocationsModule,
    TagsModule,
  ],
})
export class AppModule {}
