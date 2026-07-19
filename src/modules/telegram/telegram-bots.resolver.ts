import { UseGuards } from "@nestjs/common";
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import {
  TelegramBotsService,
  type CreateTelegramBotInput,
  type CreateTelegramChannelInput,
  type UpdateTelegramBotInput,
  type UpdateTelegramChannelInput,
} from "./telegram-bots.service";

type TelegramBotParent = {
  id: string;
  tokenEncrypted?: string;
  tokenMasked?: string;
  channels?: unknown[];
};

type TelegramChannelParent = {
  id: string;
  botId: string;
  bot?: unknown;
};

@Resolver("TelegramBot")
export class TelegramBotResolver {
  constructor(private readonly telegramBotsService: TelegramBotsService) {}

  @ResolveField("tokenMasked")
  tokenMasked(@Parent() bot: TelegramBotParent) {
    if (bot.tokenMasked) return bot.tokenMasked;
    if (bot.tokenEncrypted) {
      return this.telegramBotsService.resolveTokenMasked(bot.tokenEncrypted);
    }
    return "••••";
  }

  @ResolveField("channels")
  channels(@Parent() bot: TelegramBotParent & { channels?: unknown[] }) {
    return bot.channels ?? [];
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("telegramBots")
  telegramBots() {
    return this.telegramBotsService.listBots();
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("telegramBot")
  telegramBot(@Args("id") id: string) {
    return this.telegramBotsService.getBotById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("validateTelegramBotToken")
  validateTelegramBotToken(@Args("token") token: string) {
    return this.telegramBotsService.validateBotToken(token);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createTelegramBot")
  createTelegramBot(@Args("input") input: CreateTelegramBotInput) {
    return this.telegramBotsService.createBot(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateTelegramBot")
  updateTelegramBot(
    @Args("id") id: string,
    @Args("input") input: UpdateTelegramBotInput,
  ) {
    return this.telegramBotsService.updateBot(id, input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteTelegramBot")
  deleteTelegramBot(@Args("id") id: string) {
    return this.telegramBotsService.deleteBot(id);
  }
}

@Resolver("TelegramChannel")
export class TelegramChannelResolver {
  constructor(private readonly telegramBotsService: TelegramBotsService) {}

  @ResolveField("bot")
  async bot(@Parent() channel: TelegramChannelParent) {
    if (channel.bot) {
      return channel.bot;
    }
    return this.telegramBotsService.getBotById(channel.botId);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("telegramChannels")
  telegramChannels(
    @Args("botId", { nullable: true }) botId?: string,
    @Args("isActive", { nullable: true }) isActive?: boolean,
  ) {
    return this.telegramBotsService.listChannels({ botId, isActive });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("telegramChannel")
  telegramChannel(@Args("id") id: string) {
    return this.telegramBotsService.getChannelById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("telegramDefaultChannel")
  telegramDefaultChannel() {
    return this.telegramBotsService.getDefaultChannel();
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createTelegramChannel")
  createTelegramChannel(@Args("input") input: CreateTelegramChannelInput) {
    return this.telegramBotsService.createChannel(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateTelegramChannel")
  updateTelegramChannel(
    @Args("id") id: string,
    @Args("input") input: UpdateTelegramChannelInput,
  ) {
    return this.telegramBotsService.updateChannel(id, input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteTelegramChannel")
  deleteTelegramChannel(@Args("id") id: string) {
    return this.telegramBotsService.deleteChannel(id);
  }
}
