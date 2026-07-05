import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = "v1";

export class TelegramCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramCryptoError";
  }
}

export function resolveTelegramEncryptionKey(raw: string | undefined): Buffer {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new TelegramCryptoError(
      "TELEGRAM_TOKEN_ENCRYPTION_KEY не задан",
    );
  }

  const fromBase64 = Buffer.from(trimmed, "base64");
  if (fromBase64.length === 32) {
    return fromBase64;
  }

  const fromHex = Buffer.from(trimmed, "hex");
  if (fromHex.length === 32) {
    return fromHex;
  }

  throw new TelegramCryptoError(
    "TELEGRAM_TOKEN_ENCRYPTION_KEY должен быть 32 байта (base64 или hex)",
  );
}

export function encryptTelegramSecret(plainText: string, key: Buffer): string {
  if (!plainText.trim()) {
    throw new TelegramCryptoError("Пустой token");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptTelegramSecret(payload: string, key: Buffer): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new TelegramCryptoError("Неверный формат зашифрованного token");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const authTag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new TelegramCryptoError("Неверный формат зашифрованного token");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plain.toString("utf8");
}

export function tokenHintLast4(plainToken: string): string {
  const trimmed = plainToken.trim();
  if (trimmed.length < 4) {
    return trimmed;
  }
  return trimmed.slice(-4);
}

export function maskTelegramToken(hintLast4: string): string {
  if (!hintLast4) {
    return "***";
  }
  return `***${hintLast4}`;
}
