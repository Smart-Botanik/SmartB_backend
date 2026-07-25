import { UseGuards } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GrowProfileService } from "./grow-profile.service";

@Resolver()
export class GrowProfileResolver {
  constructor(private readonly growProfiles: GrowProfileService) {}

  @Query("growProfile")
  @UseGuards(GqlJwtAuthGuard)
  growProfile(@Args("userId") userId: string) {
    return this.growProfiles.growProfile(userId);
  }

  @Query("userProfile")
  @UseGuards(GqlJwtAuthGuard)
  userProfile(@Args("id") id: string) {
    return this.growProfiles.growProfile(id).then((p) => p.profile);
  }
}
