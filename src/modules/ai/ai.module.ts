import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ContentModule } from "../content/content.module";
import { AiRemoteGraphqlClient } from "./ai-remote.graphql-client";
import { AiRemoteService } from "./ai.remote-service";
import { AiResolver } from "./ai.resolver";

@Module({
  imports: [ConfigModule, ContentModule],
  providers: [AiRemoteGraphqlClient, AiRemoteService, AiResolver],
  exports: [AiRemoteService, AiRemoteGraphqlClient],
})
export class AiModule {}
