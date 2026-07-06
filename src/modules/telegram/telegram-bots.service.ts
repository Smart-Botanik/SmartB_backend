import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { TelegramBotCredentialsService } from "./telegram-bot-credentials.service";

const botInclude = {
  channels: {
    orderBy: { name: "asc" as const },
  },
} satisfies Prisma.TelegramBotInclude;

const channelInclude = {
  bot: true,
} satisfies Prisma.TelegramChannelInclude;

export type CreateTelegramBotInput = {
  name: string;
  token: string;
  isActive?: boolean | null;
};

export type UpdateTelegramBotInput = {
  name?: string | null;
  token?: string | null;
  isActive?: boolean | null;
};

export type CreateTelegramChannelInput = {
  name: string;
  chatId: string;
  botId: string;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  publicUrl?: string | null;
};

export type UpdateTelegramChannelInput = {
  name?: string | null;
  chatId?: string | null;
  botId?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  publicUrl?: string | null;
};

@Injectable()
export class TelegramBotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: TelegramBotCredentialsService,
  ) {}

  listBots() {
    return this.prisma.telegramBot.findMany({
      orderBy: { name: "asc" },
      include: botInclude,
    });
  }

  async getBotById(id: string) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id },
      include: botInclude,
    });
    if (!bot) {
      throw new NotFoundException("Telegram bot не найден");
    }
    return bot;
  }

  listChannels(params: { botId?: string; isActive?: boolean }) {
    return this.prisma.telegramChannel.findMany({
      where: {
        ...(params.botId ? { botId: params.botId } : {}),
        ...(params.isActive != null ? { isActive: params.isActive } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: channelInclude,
    });
  }

  async getChannelById(id: string) {
    const channel = await this.prisma.telegramChannel.findUnique({
      where: { id },
      include: channelInclude,
    });
    if (!channel) {
      throw new NotFoundException("Telegram channel не найден");
    }
    return channel;
  }

  getDefaultChannel() {
    return this.prisma.telegramChannel.findFirst({
      where: { isDefault: true, isActive: true },
      include: channelInclude,
    });
  }

  async createBot(input: CreateTelegramBotInput) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException("Имя бота обязательно");
    }

    const validated = await this.credentials.encryptAndValidateToken(input.token);

    return this.prisma.telegramBot.create({
      data: {
        name,
        tokenEncrypted: validated.tokenEncrypted,
        username: validated.username ?? null,
        isActive: input.isActive ?? true,
      },
      include: botInclude,
    });
  }

  async updateBot(id: string, input: UpdateTelegramBotInput) {
    await this.getBotById(id);

    const data: Prisma.TelegramBotUpdateInput = {};

    if (input.name != null) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("Имя бота не может быть пустым");
      }
      data.name = name;
    }

    if (input.isActive != null) {
      data.isActive = input.isActive;
    }

    if (input.token?.trim()) {
      const validated = await this.credentials.encryptAndValidateToken(
        input.token,
      );
      data.tokenEncrypted = validated.tokenEncrypted;
      data.username = validated.username ?? null;
    }

    return this.prisma.telegramBot.update({
      where: { id },
      data,
      include: botInclude,
    });
  }

  async deleteBot(id: string) {
    const bot = await this.getBotById(id);
    if (bot.channels.length > 0) {
      throw new BadRequestException(
        "Нельзя удалить бота: сначала удалите связанные каналы",
      );
    }

    await this.prisma.telegramBot.delete({ where: { id } });
    return true;
  }

  async createChannel(input: CreateTelegramChannelInput) {
    const name = input.name.trim();
    const chatId = input.chatId.trim();
    if (!name || !chatId) {
      throw new BadRequestException("Имя и chatId канала обязательны");
    }

    await this.getBotById(input.botId);

    const isDefault = input.isDefault ?? false;
    const isActive = input.isActive ?? true;

    return this.prisma.$transaction(async tx => {
      if (isDefault) {
        await tx.telegramChannel.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.telegramChannel.create({
        data: {
          name,
          chatId,
          botId: input.botId,
          isDefault,
          isActive,
          publicUrl: input.publicUrl?.trim() || null,
        },
        include: channelInclude,
      });
    });
  }

  async updateChannel(id: string, input: UpdateTelegramChannelInput) {
    await this.getChannelById(id);

    const data: Prisma.TelegramChannelUpdateInput = {};

    if (input.name != null) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("Имя канала не может быть пустым");
      }
      data.name = name;
    }

    if (input.chatId != null) {
      const chatId = input.chatId.trim();
      if (!chatId) {
        throw new BadRequestException("chatId не может быть пустым");
      }
      data.chatId = chatId;
    }

    if (input.publicUrl !== undefined) {
      data.publicUrl = input.publicUrl?.trim() || null;
    }

    if (input.isActive != null) {
      data.isActive = input.isActive;
    }

    if (input.botId != null) {
      await this.getBotById(input.botId);
      data.bot = { connect: { id: input.botId } };
    }

    const setDefault = input.isDefault === true;

    return this.prisma.$transaction(async tx => {
      if (setDefault) {
        await tx.telegramChannel.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
        data.isDefault = true;
      } else if (input.isDefault === false) {
        data.isDefault = false;
      }

      return tx.telegramChannel.update({
        where: { id },
        data,
        include: channelInclude,
      });
    });
  }

  async deleteChannel(id: string) {
    await this.getChannelById(id);
    await this.prisma.telegramChannel.delete({ where: { id } });
    return true;
  }

  resolveTokenMasked(tokenEncrypted: string): string {
    return this.credentials.maskStoredToken(tokenEncrypted);
  }

  async validateBotToken(token: string) {
    const me = await this.credentials.validatePlainToken(token);
    return {
      telegramBotId: String(me.id),
      username: me.username ?? null,
      firstName: me.firstName,
      isBot: me.isBot,
    };
  }
}
