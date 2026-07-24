"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDevTelegramFromEnv = seedDevTelegramFromEnv;
const undici_1 = require("undici");
const telegram_crypto_1 = require("../modules/telegram/telegram-crypto");
const telegram_proxy_config_1 = require("../modules/telegram/telegram-proxy.config");
const SEED_BOT_NAME = "seed:env-default";
async function fetchGetMe(token) {
    const proxyUrl = (0, telegram_proxy_config_1.resolveTelegramProxyUrl)({
        proxyUrl: process.env.TELEGRAM_PROXY_URL,
        proxyType: process.env.TELEGRAM_PROXY_TYPE,
        proxyHost: process.env.TELEGRAM_PROXY_HOST,
        proxyPort: process.env.TELEGRAM_PROXY_PORT,
        proxyUser: process.env.TELEGRAM_PROXY_USER,
        proxyPass: process.env.TELEGRAM_PROXY_PASS,
    });
    const dispatcher = proxyUrl ? new undici_1.ProxyAgent(proxyUrl) : undefined;
    const response = await (0, undici_1.fetch)(`https://api.telegram.org/bot${token.trim()}/getMe`, dispatcher ? { dispatcher } : undefined);
    const payload = (await response.json());
    if (!payload.ok || !payload.result?.is_bot) {
        throw new Error(payload.description ?? "Telegram getMe failed");
    }
    return {
        id: payload.result.id,
        username: payload.result.username,
        firstName: payload.result.first_name,
    };
}
async function seedDevTelegramFromEnv(prisma) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHANNEL_ID?.trim();
    if (!token || !chatId) {
        return {
            skipped: true,
            reason: "TELEGRAM_BOT_TOKEN или TELEGRAM_CHANNEL_ID не заданы",
        };
    }
    const existingBots = await prisma.telegramBot.count();
    if (existingBots > 0) {
        return {
            skipped: true,
            reason: "В БД уже есть Telegram-боты — импорт из env пропущен",
            existingBots,
        };
    }
    const encryptionKey = (0, telegram_crypto_1.resolveTelegramEncryptionKey)(process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY);
    const me = await fetchGetMe(token);
    const tokenEncrypted = (0, telegram_crypto_1.encryptTelegramSecret)(token, encryptionKey);
    const botName = process.env.TELEGRAM_BOT_NAME?.trim() ||
        (me.username ? `@${me.username}` : me.firstName) ||
        SEED_BOT_NAME;
    const channelName = process.env.TELEGRAM_CHANNEL_NAME?.trim() || "Канал по умолчанию (env)";
    const bot = await prisma.telegramBot.create({
        data: {
            name: botName,
            tokenEncrypted,
            username: me.username ?? null,
            isActive: true,
        },
    });
    const channel = await prisma.telegramChannel.create({
        data: {
            name: channelName,
            chatId,
            botId: bot.id,
            isDefault: true,
            isActive: true,
            publicUrl: process.env.TELEGRAM_CHANNEL_PUBLIC_URL?.trim() || null,
        },
    });
    return {
        skipped: false,
        botId: bot.id,
        channelId: channel.id,
        botName: bot.name,
        channelName: channel.name,
        username: me.username ?? null,
    };
}
//# sourceMappingURL=seed-dev-telegram.js.map