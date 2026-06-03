import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TaxonomyRepository } from "./taxonomy.repository";
import { TaxonomyTagResolver } from "./taxonomy-tag.resolver";
import { TaxonomyTagService } from "./taxonomy-tag.service";
import { TaxonomyRemoteGraphqlClient } from "./taxonomy-remote.graphql-client";
import { TaxonomyTagRemoteService } from "./taxonomy-tag.remote-service";

@Module({
  imports: [ConfigModule],
  providers: [
    TaxonomyRepository,
    TaxonomyRemoteGraphqlClient,
    TaxonomyTagRemoteService,
    {
      provide: TaxonomyTagService,
      useFactory: (
        config: ConfigService,
        repo: TaxonomyRepository,
        remote: TaxonomyTagRemoteService,
      ) => {
        if (config.get<string>("TAXONOMY_SERVICE_URL")?.trim()) {
          return remote;
        }
        return new TaxonomyTagService(repo);
      },
      inject: [ConfigService, TaxonomyRepository, TaxonomyTagRemoteService],
    },
    TaxonomyTagResolver,
  ],
  exports: [TaxonomyTagService],
})
export class TaxonomyModule {}
