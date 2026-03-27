import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { GraphQLDateTime } from "graphql-scalars";
import type { Request } from "express";
import { AuthModule } from "./modules/auth/auth.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { PlantModule } from "./modules/plant/plant.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";

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
    UsersModule,
    AuthModule,
    PlantModule,
    DiaryModule,
  ],
})
export class AppModule {}
