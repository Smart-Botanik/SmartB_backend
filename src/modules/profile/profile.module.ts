import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { GrowProfileResolver } from "./grow-profile.resolver";
import { GrowProfileService } from "./grow-profile.service";
import { UserProfileRemoteService } from "./user-profile.remote-service";
import { UserRemoteGraphqlClient } from "./user-remote.graphql-client";

@Module({
  imports: [UsersModule],
  providers: [
    UserRemoteGraphqlClient,
    UserProfileRemoteService,
    GrowProfileService,
    GrowProfileResolver,
  ],
  exports: [UserProfileRemoteService, GrowProfileService],
})
export class ProfileModule {}
