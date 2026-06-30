import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import type { Request } from "express";
import { AuthModule } from "./modules/auth/auth.module";
import { ReferenceDataModule } from "./modules/reference-data/reference-data.module";
import { TaxonomyModule } from "./modules/taxonomy/taxonomy.module";
import { ContentModule } from "./modules/content/content.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { EventsModule } from "./modules/events/events.module";
import { MediaModule } from "./modules/media/media.module";
import { PlantModule } from "./modules/plant/plant.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { CultivationUnitsModule } from "./modules/cultivation-units/cultivation-units.module";
import { PrimitivesModule } from "./modules/primitives/primitives.module";
import { RegistryModule } from "./modules/registry/registry.module";
import { TagsModule } from "./modules/tags/tags.module";
import { TelegramModule } from "./modules/telegram/telegram.module";
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
    ReferenceDataModule,
    TaxonomyModule,
    ContentModule,
    TelegramModule,
    PrimitivesModule,
    RegistryModule,
    LocationsModule,
    MetricsModule,
    CultivationUnitsModule,
    TagsModule,
  ],
})
export class AppModule {}
