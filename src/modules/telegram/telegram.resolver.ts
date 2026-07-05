import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { TelegramGuidePublishService } from "./telegram-guide-publish.service";

@Resolver()
export class TelegramResolver {
  constructor(
    private readonly telegramGuidePublish: TelegramGuidePublishService,
  ) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("publishCropGuideToTelegram")
  publishCropGuideToTelegram(
    @Args("id") id: string,
    @Args("channelId") channelId?: string,
  ) {
    return this.telegramGuidePublish.publishCropGuide(id, channelId);
  }
}
