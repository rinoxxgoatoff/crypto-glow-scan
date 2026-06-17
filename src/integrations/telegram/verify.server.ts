import { createHmac, timingSafeEqual } from "crypto";

export interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
}

export interface VerifiedTg {
  user: TgUser;
  isAdmin: boolean;
}

const ADMIN_IDS = new Set<number>([7808474075]);

export function isAdminTg(id: number): boolean {
  return ADMIN_IDS.has(id);
}

/**
 * Verify Telegram WebApp initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string): VerifiedTg {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  if (!initData) throw new Error("initData missing");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash") ?? "";
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(computed, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid Telegram signature");
  }

  // Optional freshness check (auth_date within 24h)
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) {
    throw new Error("Telegram auth_date expired");
  }

  const userJson = params.get("user");
  if (!userJson) throw new Error("Telegram user missing");
  const user = JSON.parse(userJson) as TgUser;

  return { user, isAdmin: isAdminTg(user.id) };
}

/**
 * Dev bypass: when initData is empty and ALLOW_DEV_BYPASS=1 is set,
 * accept a raw devTgId. Lets you test in a browser outside Telegram.
 */
export function authenticateTg(input: { initData?: string; devTgId?: number }): VerifiedTg {
  if (input.initData && input.initData.length > 0) {
    return verifyTelegramInitData(input.initData);
  }
  const devAllowed =
    process.env.ALLOW_DEV_BYPASS === "1" || process.env.NODE_ENV !== "production";
  if (devAllowed && input.devTgId) {
    return {
      user: { id: input.devTgId, first_name: "Dev", username: `dev_${input.devTgId}` },
      isAdmin: isAdminTg(input.devTgId),
    };
  }
  throw new Error("Telegram authentication required");
}
