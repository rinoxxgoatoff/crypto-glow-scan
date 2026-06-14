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
  await sb.from("tg_users").upsert(
    {
      tg_id: tg.id,
      username: tg.username ?? null,
      first_name: tg.first_name ?? null,
      last_name: tg.last_name ?? null,
      photo_url: tg.photo_url ?? null,
      language_code: tg.language_code ?? null,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "tg_id" },
  );
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
