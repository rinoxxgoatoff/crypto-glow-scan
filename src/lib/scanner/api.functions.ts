import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { COINS, COIN_LIST, DAILY_TON, type CoinSym } from "./coins";

const AuthSchema = z.object({
  initData: z.string().optional().default(""),
  devTgId: z.number().optional(),
});

// ---------------- helpers ----------------

async function auth(initData?: string, devTgId?: number) {
  const { authenticateTg } = await import("@/integrations/telegram/verify.server");
  return authenticateTg({ initData, devTgId });
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureUserRow(tg: {
  id: number; username?: string; first_name?: string; last_name?: string;
  photo_url?: string; language_code?: string;
}) {
  const sb = await admin();
  // Ne pousser que les champs réellement fournis : évite d'écraser les vrais
  // username/first_name/photo (Telegram) avec des null lors d'un bootstrap
  // browser-preview (devTgId sans profil).
  const row = {
    tg_id: tg.id,
    last_seen: new Date().toISOString(),
    ...(tg.username ? { username: tg.username } : {}),
    ...(tg.first_name ? { first_name: tg.first_name } : {}),
    ...(tg.last_name ? { last_name: tg.last_name } : {}),
    ...(tg.photo_url ? { photo_url: tg.photo_url } : {}),
    ...(tg.language_code ? { language_code: tg.language_code } : {}),
  };
  await sb.from("tg_users").upsert(row, { onConflict: "tg_id" });
}

async function loadFullMe(tgId: number, isAdmin: boolean) {
  const sb = await admin();
  const [{ data: u }, { data: b }, { data: h }] = await Promise.all([
    sb.from("tg_users").select("*").eq("tg_id", tgId).maybeSingle(),
    sb.from("tg_balances").select("sym, amount").eq("tg_id", tgId),
    sb.from("tg_history").select("id, ts, sym, amount, usd").eq("tg_id", tgId).order("ts", { ascending: false }).limit(50),
  ]);
  const bal: Record<string, number> = {};
  for (const sym of COIN_LIST) bal[sym] = 0;
  for (const row of b ?? []) bal[row.sym] = Number(row.amount);
  return {
    me: {
      tg_id: Number(u?.tg_id ?? tgId),
      username: u?.username ?? null,
      first_name: u?.first_name ?? null,
      last_name: u?.last_name ?? null,
      photo_url: u?.photo_url ?? null,
      has_miner: !!u?.has_miner,
      bonus_day: u?.bonus_day ?? 1,
      last_bonus: u?.last_bonus ?? null,
      earned_usd: Number(u?.earned_usd ?? 0),
      sessions: u?.sessions ?? 0,
      is_admin: isAdmin,
    },
    bal,
    history: (h ?? []).map((r) => ({
      id: r.id as string,
      ts: new Date(r.ts as string).getTime(),
      sym: r.sym as CoinSym,
      amount: Number(r.amount),
      usd: Number(r.usd),
    })),
  };
}

// ---------------- bootstrap ----------------

export const bootstrapUser = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user, isAdmin } = await auth(data.initData, data.devTgId);
    await ensureUserRow(user);
    return loadFullMe(user.id, isAdmin);
  });

export const getMe = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user, isAdmin } = await auth(data.initData, data.devTgId);
    return loadFullMe(user.id, isAdmin);
  });

// ---------------- mutations ----------------

export const startSession = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const { data: u } = await sb.from("tg_users").select("sessions").eq("tg_id", user.id).single();
    await sb.from("tg_users")
      .update({ sessions: (u?.sessions ?? 0) + 1, last_seen: new Date().toISOString() })
      .eq("tg_id", user.id);
    return { ok: true };
  });

export const addReward = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; sym: string; amount: number; usd: number }) =>
    AuthSchema.extend({
      sym: z.enum(COIN_LIST as [CoinSym, ...CoinSym[]]),
      amount: z.number().positive().max(1e6),
      usd: z.number().positive().max(1000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const { data: cur } = await sb
      .from("tg_balances")
      .select("amount")
      .eq("tg_id", user.id)
      .eq("sym", data.sym)
      .maybeSingle();
    const newAmount = Number(cur?.amount ?? 0) + data.amount;
    await Promise.all([
      sb.from("tg_balances").upsert(
        { tg_id: user.id, sym: data.sym, amount: newAmount },
        { onConflict: "tg_id,sym" },
      ),
      sb.from("tg_history").insert({
        tg_id: user.id, sym: data.sym, amount: data.amount, usd: data.usd, kind: "mining",
      }),
      (async () => {
        const { data: u } = await sb.from("tg_users").select("earned_usd").eq("tg_id", user.id).single();
        await sb.from("tg_users").update({
          earned_usd: Number(u?.earned_usd ?? 0) + data.usd,
          last_seen: new Date().toISOString(),
        }).eq("tg_id", user.id);
      })(),
    ]);
    return { ok: true, newAmount };
  });

export const claimBonus = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const today = new Date().toISOString().slice(0, 10);
    const { data: u } = await sb.from("tg_users").select("bonus_day, last_bonus, earned_usd").eq("tg_id", user.id).single();
    if (u?.last_bonus === today) return { ok: false, reason: "already_claimed" as const };
    const day = u?.bonus_day ?? 1;
    const ton = DAILY_TON[(day - 1) % 7];
    const usd = ton * COINS.TON.price;
    const { data: cur } = await sb.from("tg_balances").select("amount").eq("tg_id", user.id).eq("sym", "TON").maybeSingle();
    await Promise.all([
      sb.from("tg_balances").upsert(
        { tg_id: user.id, sym: "TON", amount: Number(cur?.amount ?? 0) + ton },
        { onConflict: "tg_id,sym" },
      ),
      sb.from("tg_users").update({
        bonus_day: Math.min(day + 1, 7),
        last_bonus: today,
        earned_usd: Number(u?.earned_usd ?? 0) + usd,
      }).eq("tg_id", user.id),
      sb.from("tg_history").insert({
        tg_id: user.id, sym: "TON", amount: ton, usd, kind: "bonus",
      }),
    ]);
    return { ok: true as const, day, tonAmount: ton };
  });

export const swap = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; from: string; to: string; fromAmount: number }) =>
    AuthSchema.extend({
      from: z.enum(COIN_LIST as [CoinSym, ...CoinSym[]]),
      to: z.enum(COIN_LIST as [CoinSym, ...CoinSym[]]),
      fromAmount: z.number().positive(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.from === data.to) return { ok: false as const, reason: "same_token" };
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const { data: rows } = await sb
      .from("tg_balances")
      .select("sym, amount")
      .eq("tg_id", user.id)
      .in("sym", [data.from, data.to]);
    const fromBal = Number(rows?.find((r) => r.sym === data.from)?.amount ?? 0);
    const toBal = Number(rows?.find((r) => r.sym === data.to)?.amount ?? 0);
    if (fromBal < data.fromAmount) return { ok: false as const, reason: "insufficient" };
    const rate = COINS[data.from as CoinSym].price / COINS[data.to as CoinSym].price;
    const out = data.fromAmount * rate;
    await Promise.all([
      sb.from("tg_balances").upsert({ tg_id: user.id, sym: data.from, amount: fromBal - data.fromAmount }, { onConflict: "tg_id,sym" }),
      sb.from("tg_balances").upsert({ tg_id: user.id, sym: data.to, amount: toBal + out }, { onConflict: "tg_id,sym" }),
    ]);
    return { ok: true as const, out };
  });

export const buyMiner = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    await sb.from("tg_users").update({ has_miner: true }).eq("tg_id", user.id);
    return { ok: true };
  });

export const resetAll = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    await Promise.all([
      sb.from("tg_balances").delete().eq("tg_id", user.id),
      sb.from("tg_history").delete().eq("tg_id", user.id),
      sb.from("tg_users").update({
        earned_usd: 0, sessions: 0, has_miner: false, bonus_day: 1, last_bonus: null,
      }).eq("tg_id", user.id),
    ]);
    return { ok: true };
  });

// ---------------- admin ----------------

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const { data: users } = await sb
      .from("tg_users")
      .select("tg_id, username, first_name, last_name, photo_url, has_miner, earned_usd, sessions, last_seen, created_at")
      .order("last_seen", { ascending: false })
      .limit(500);
    const { data: balances } = await sb.from("tg_balances").select("tg_id, sym, amount");
    const usdByUser = new Map<number, number>();
    for (const r of balances ?? []) {
      const p = COINS[r.sym as CoinSym]?.price ?? 0;
      const tg = Number(r.tg_id);
      usdByUser.set(tg, (usdByUser.get(tg) ?? 0) + Number(r.amount) * p);
    }
    return (users ?? []).map((u) => ({
      tg_id: Number(u.tg_id),
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      photo_url: u.photo_url,
      has_miner: !!u.has_miner,
      earned_usd: Number(u.earned_usd),
      sessions: u.sessions,
      last_seen: u.last_seen,
      created_at: u.created_at,
      total_balance_usd: usdByUser.get(Number(u.tg_id)) ?? 0,
    }));
  });

export const adminGetUserDetail = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; tgId: number }) =>
    AuthSchema.extend({ tgId: z.number() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const [{ data: user }, { data: bals }, { data: hist }] = await Promise.all([
      sb.from("tg_users").select("*").eq("tg_id", data.tgId).maybeSingle(),
      sb.from("tg_balances").select("sym, amount").eq("tg_id", data.tgId),
      sb.from("tg_history").select("id, ts, sym, amount, usd, kind").eq("tg_id", data.tgId).order("ts", { ascending: false }).limit(30),
    ]);
    return { user, balances: bals ?? [], history: hist ?? [] };
  });

export const adminToggleMiner = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; tgId: number; hasMiner: boolean }) =>
    AuthSchema.extend({ tgId: z.number(), hasMiner: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    await sb.from("tg_users").update({ has_miner: data.hasMiner }).eq("tg_id", data.tgId);
    return { ok: true };
  });

// ---------------- boost / ads ----------------

type BoostConfig = {
  enabled: boolean;
  multiplier: number;
  duration_min: number;
  cooldown_min: number;
  adsgram_block_id: string;
  revenue_per_view_usd: number;
};

const DEFAULT_BOOST: BoostConfig = {
  enabled: true,
  multiplier: 2,
  duration_min: 30,
  cooldown_min: 10,
  adsgram_block_id: "bot-35303",
  revenue_per_view_usd: 0.003,
};

async function readBoostConfig(): Promise<BoostConfig> {
  const sb = await admin();
  const { data } = await sb.from("tg_app_settings").select("value").eq("key", "boost").maybeSingle();
  return { ...DEFAULT_BOOST, ...(data?.value as Partial<BoostConfig> | undefined) };
}

export const getBoostState = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const cfg = await readBoostConfig();
    const [{ data: active }, { data: last }] = await Promise.all([
      sb.from("tg_boosts").select("expires_at, multiplier").eq("tg_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("tg_ad_views").select("ts").eq("tg_id", user.id)
        .order("ts", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      config: {
        enabled: cfg.enabled,
        multiplier: cfg.multiplier,
        duration_min: cfg.duration_min,
        cooldown_min: cfg.cooldown_min,
        adsgram_block_id: cfg.adsgram_block_id,
      },
      active: active ? { expires_at: active.expires_at as string, multiplier: Number(active.multiplier) } : null,
      last_view_at: (last?.ts as string | undefined) ?? null,
    };
  });

export const claimAdBoost = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { user } = await auth(data.initData, data.devTgId);
    const sb = await admin();
    const cfg = await readBoostConfig();
    if (!cfg.enabled) return { ok: false as const, reason: "disabled" };
    // cooldown check
    const { data: last } = await sb.from("tg_ad_views").select("ts").eq("tg_id", user.id)
      .order("ts", { ascending: false }).limit(1).maybeSingle();
    if (last?.ts) {
      const elapsed = (Date.now() - new Date(last.ts as string).getTime()) / 60000;
      if (elapsed < cfg.cooldown_min) {
        return { ok: false as const, reason: "cooldown", retry_in_sec: Math.ceil((cfg.cooldown_min - elapsed) * 60) };
      }
    }
    const expires = new Date(Date.now() + cfg.duration_min * 60_000).toISOString();
    await Promise.all([
      sb.from("tg_ad_views").insert({ tg_id: user.id, block_id: cfg.adsgram_block_id, status: "rewarded" }),
      sb.from("tg_boosts").insert({ tg_id: user.id, multiplier: cfg.multiplier, expires_at: expires, source: "ad" }),
    ]);
    return { ok: true as const, expires_at: expires, multiplier: cfg.multiplier };
  });

// ---------------- admin extras ----------------

export const adminGetSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    return { boost: await readBoostConfig() };
  });

export const adminUpdateBoostConfig = createServerFn({ method: "POST" })
  .inputValidator((input: {
    initData?: string; devTgId?: number;
    enabled: boolean; multiplier: number; duration_min: number;
    cooldown_min: number; adsgram_block_id: string; revenue_per_view_usd: number;
  }) =>
    AuthSchema.extend({
      enabled: z.boolean(),
      multiplier: z.number().min(1).max(10),
      duration_min: z.number().int().min(1).max(1440),
      cooldown_min: z.number().int().min(0).max(1440),
      adsgram_block_id: z.string().min(1).max(64),
      revenue_per_view_usd: z.number().min(0).max(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const value = {
      enabled: data.enabled,
      multiplier: data.multiplier,
      duration_min: data.duration_min,
      cooldown_min: data.cooldown_min,
      adsgram_block_id: data.adsgram_block_id,
      revenue_per_view_usd: data.revenue_per_view_usd,
    };
    await sb.from("tg_app_settings").upsert(
      { key: "boost", value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    return { ok: true, value };
  });

export const adminGetStats = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number }) => AuthSchema.parse(input))
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const cfg = await readBoostConfig();
    const [
      { count: views24 },
      { count: views7d },
      { count: viewsTotal },
      { count: active24 },
      { count: activeBoosts },
    ] = await Promise.all([
      sb.from("tg_ad_views").select("id", { count: "exact", head: true }).gte("ts", since24),
      sb.from("tg_ad_views").select("id", { count: "exact", head: true }).gte("ts", since7d),
      sb.from("tg_ad_views").select("id", { count: "exact", head: true }),
      sb.from("tg_users").select("tg_id", { count: "exact", head: true }).gte("last_seen", since24),
      sb.from("tg_boosts").select("id", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
    ]);
    return {
      ad_views_24h: views24 ?? 0,
      ad_views_7d: views7d ?? 0,
      ad_views_total: viewsTotal ?? 0,
      active_users_24h: active24 ?? 0,
      active_boosts: activeBoosts ?? 0,
      revenue_estimate_usd: (viewsTotal ?? 0) * cfg.revenue_per_view_usd,
      revenue_24h_usd: (views24 ?? 0) * cfg.revenue_per_view_usd,
      revenue_per_view_usd: cfg.revenue_per_view_usd,
    };
  });

export const adminAdjustEarned = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; tgId: number; deltaUsd: number }) =>
    AuthSchema.extend({ tgId: z.number(), deltaUsd: z.number().min(-10000).max(10000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const { data: u } = await sb.from("tg_users").select("earned_usd").eq("tg_id", data.tgId).single();
    const next = Math.max(0, Number(u?.earned_usd ?? 0) + data.deltaUsd);
    await sb.from("tg_users").update({ earned_usd: next }).eq("tg_id", data.tgId);
    return { ok: true, earned_usd: next };
  });

export const adminGetBoostHistory = createServerFn({ method: "POST" })
  .inputValidator((input: { initData?: string; devTgId?: number; limit?: number }) =>
    AuthSchema.extend({ limit: z.number().int().min(1).max(500).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { isAdmin } = await auth(data.initData, data.devTgId);
    if (!isAdmin) throw new Error("Forbidden");
    const sb = await admin();
    const limit = data.limit ?? 100;
    const [{ data: boosts }, { data: views }, { data: users }] = await Promise.all([
      sb.from("tg_boosts")
        .select("id, tg_id, multiplier, started_at, expires_at, source")
        .order("started_at", { ascending: false }).limit(limit),
      sb.from("tg_ad_views")
        .select("id, tg_id, ts, block_id, status")
        .order("ts", { ascending: false }).limit(limit),
      sb.from("tg_users").select("tg_id, username, first_name, last_name"),
    ]);
    const nameByTg = new Map<number, string>();
    for (const u of users ?? []) {
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ")
        || (u.username ? `@${u.username}` : `User ${u.tg_id}`);
      nameByTg.set(Number(u.tg_id), name);
    }
    return {
      boosts: (boosts ?? []).map((b) => ({
        id: b.id as string,
        tg_id: Number(b.tg_id),
        name: nameByTg.get(Number(b.tg_id)) ?? `User ${b.tg_id}`,
        multiplier: Number(b.multiplier),
        started_at: b.started_at as string,
        expires_at: b.expires_at as string,
        source: b.source as string,
      })),
      views: (views ?? []).map((v) => ({
        id: v.id as string,
        tg_id: Number(v.tg_id),
        name: nameByTg.get(Number(v.tg_id)) ?? `User ${v.tg_id}`,
        ts: v.ts as string,
        block_id: (v.block_id as string | null) ?? "",
        status: v.status as string,
      })),
    };
  });

