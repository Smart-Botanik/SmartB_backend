import { UseGuards } from "@nestjs/common";
import {
  Args,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { TelegramBotsService } from "./telegram-bots.service";
import { TelegramGuidePublicationsService } from "./telegram-guide-publications.service";

type PublicationParent = {
  id: string;
  channelId?: string | null;
  botId?: string | null;
  channelName?: string | null;
  botName?: string | null;
  channel?: unknown;
};

@Resolver("CropGuideTelegramPublication")
export class CropGuideTelegramPublicationResolver {
  constructor(
    private readonly publicationsService: TelegramGuidePublicationsService,
    private readonly telegramBotsService: TelegramBotsService,
  ) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("cropGuideTelegramPublications")
  cropGuideTelegramPublications(
    @Args("cropGuideId") cropGuideId: string,
    @Args("limit") limit?: number,
  ) {
    return this.publicationsService.listByGuideId(cropGuideId, limit ?? 4);
  }

  @ResolveField("channel")
  async channel(@Parent() publication: PublicationParent) {
    if (publication.channel) {
      return publication.channel;
    }
    if (!publication.channelId) {
      return null;
    }
    try {
      return await this.telegramBotsService.getChannelById(publication.channelId);
    } catch {
      return null;
    }
  }

  @ResolveField("bot")
  async bot(@Parent() publication: PublicationParent & { channel?: { bot?: unknown } }) {
    if (publication.channel && typeof publication.channel === "object" && "bot" in publication.channel) {
      return publication.channel.bot ?? null;
    }
    if (!publication.botId) {
      return null;
    }
    try {
      return await this.telegramBotsService.getBotById(publication.botId);
    } catch {
      return null;
    }
  }

  @ResolveField("botName")
  botName(@Parent() publication: PublicationParent & { channel?: { bot?: { name?: string } } }) {
    return (
      publication.channel?.bot?.name ??
      publication.botName ??
      null
    );
  }

  @ResolveField("channelName")
  channelName(@Parent() publication: PublicationParent & { channel?: { name?: string } }) {
    return publication.channel?.name ?? publication.channelName ?? null;
  }
}
