const PROXY_SCHEMES = new Set([
  "http:",
  "https:",
  "socks:",
  "socks4:",
  "socks4a:",
  "socks5:",
  "socks5h:",
]);

export type TelegramProxyEnv = {
  proxyUrl?: string | null;
  proxyType?: string | null;
  proxyHost?: string | null;
  proxyPort?: string | null;
  proxyUser?: string | null;
  proxyPass?: string | null;
};

export class TelegramProxyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramProxyConfigError";
  }
}

function validateProxyUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TelegramProxyConfigError("TELEGRAM_PROXY_URL: неверный URL");
  }

  if (!PROXY_SCHEMES.has(parsed.protocol)) {
    throw new TelegramProxyConfigError(
      `TELEGRAM_PROXY_URL: неподдерживаемая схема ${parsed.protocol} (http, https, socks5)`,
    );
  }
}

function buildAuth(user?: string | null, pass?: string | null): string {
  const trimmedUser = user?.trim();
  if (!trimmedUser) {
    return "";
  }

  const trimmedPass = pass?.trim() ?? "";
  return `${encodeURIComponent(trimmedUser)}:${encodeURIComponent(trimmedPass)}@`;
}

export function resolveTelegramProxyUrl(
  env: TelegramProxyEnv,
): string | null {
  const direct = env.proxyUrl?.trim();
  if (direct) {
    validateProxyUrl(direct);
    return direct;
  }

  const host = env.proxyHost?.trim();
  const port = env.proxyPort?.trim();
  if (!host && !port) {
    return null;
  }

  if (!host || !port) {
    throw new TelegramProxyConfigError(
      "TELEGRAM_PROXY_HOST и TELEGRAM_PROXY_PORT должны быть заданы вместе",
    );
  }

  const type = env.proxyType?.trim().toLowerCase() || "http";
  if (type !== "http" && type !== "https" && type !== "socks5" && type !== "socks5h") {
    throw new TelegramProxyConfigError(
      `TELEGRAM_PROXY_TYPE: неподдерживаемое значение «${type}» (http, https, socks5)`,
    );
  }

  const url = `${type}://${buildAuth(env.proxyUser, env.proxyPass)}${host}:${port}`;
  validateProxyUrl(url);
  return url;
}
