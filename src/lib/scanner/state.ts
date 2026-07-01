import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";
import { COIN_LIST, COINS, DAILY_TON, type CoinSym } from "./coins";
import {
  addReward as srvAddReward,
  bootstrapUser,
  buyMiner as srvBuyMiner,
  claimBonus as srvClaimBonus,
  getMe,
  resetAll as srvResetAll,
  startSession as srvStartSession,
  swap as srvSwap,
} from "./api.functions";

export interface MeRow {
  tg_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  has_miner: boolean;
  bonus_day: number;
  last_bonus: string | null;
  earned_usd: number;
  sessions: number;
  is_admin: boolean;
}

export interface RewardEntry {
  id: string;
  ts: number;
  sym: CoinSym;
  amount: number;
  usd: number;
}

type Balances = Record<CoinSym, number>;

interface ScannerState {
  initData: string;
  devTgId: number | null;
  ready: boolean;
  authError: string | null;
  me: MeRow | null;
  bal: Balances;
  history: RewardEntry[];

  setDevTgId: (id: number | null) => void;
  setInitData: (s: string) => void;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;

  addReward: (sym: CoinSym, amount: number, usd: number) => Promise<void>;
  startSession: () => Promise<void>;
  buyMiner: () => Promise<void>;
  claimBonus: () => Promise<{ day: number; tonAmount: number } | null>;
  swap: (from: CoinSym, to: CoinSym, fromAmount: number) => Promise<boolean>;
  resetAll: () => Promise<void>;
}

const emptyBal = (): Balances =>
  COIN_LIST.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Balances);

function authPayload(s: ScannerState) {
  return { initData: s.initData, devTgId: s.devTgId ?? undefined };
}

export const useScanner = create<ScannerState>()(
  persist(
    (set, get) => ({
      initData: "",
      devTgId: null,
      ready: false,
      authError: null,
      me: null,
      bal: emptyBal(),
      history: [],

      setDevTgId: (id) => set({ devTgId: id, ready: false }),
      setInitData: (s) => set({ initData: s }),

      bootstrap: async () => {
        try {
          const res = await bootstrapUser({ data: authPayload(get()) });
          set({
            me: res.me,
            bal: { ...emptyBal(), ...res.bal },
            history: res.history,
            ready: true,
            authError: null,
          });
        } catch (e) {
          set({ ready: false, authError: (e as Error).message });
        }
      },

      refresh: async () => {
        try {
          const res = await getMe({ data: authPayload(get()) });
          set({
            me: res.me,
            bal: { ...emptyBal(), ...res.bal },
            history: res.history,
          });
        } catch (e) {
          console.warn("refresh failed", e);
        }
      },

      addReward: async (sym, amount, usd) => {
        // optimistic
        set((s) => ({
          bal: { ...s.bal, [sym]: (s.bal[sym] || 0) + amount },
          history: [
            { id: Math.random().toString(36).slice(2, 10), ts: Date.now(), sym, amount, usd },
            ...s.history,
          ].slice(0, 50),
          me: s.me ? { ...s.me, earned_usd: s.me.earned_usd + usd } : s.me,
        }));
        try {
          await srvAddReward({ data: { ...authPayload(get()), sym, amount, usd } });
        } catch (e) {
          console.warn("addReward failed", e);
        }
      },

      startSession: async () => {
        set((s) => (s.me ? { me: { ...s.me, sessions: s.me.sessions + 1 } } : s));
        try {
          await srvStartSession({ data: authPayload(get()) });
        } catch (e) {
          console.warn("startSession failed", e);
        }
      },

      buyMiner: async () => {
        await srvBuyMiner({ data: authPayload(get()) });
        set((s) => (s.me ? { me: { ...s.me, has_miner: true } } : s));
      },

      claimBonus: async () => {
        const res = await srvClaimBonus({ data: authPayload(get()) });
        if (!res.ok) return null;
        await get().refresh();
        return { day: res.day, tonAmount: res.tonAmount };
      },

      swap: async (from, to, fromAmount) => {
        const res = await srvSwap({ data: { ...authPayload(get()), from, to, fromAmount } });
        if (!res.ok) return false;
        await get().refresh();
        return true;
      },

      resetAll: async () => {
        await srvResetAll({ data: authPayload(get()) });
        await get().refresh();
      },
    }),
    {
      name: "scanner-crypto-tg-v1",
      partialize: (s) => ({ devTgId: s.devTgId }),
    },
  ),
);

/** Hook: read Telegram WebApp initData and bootstrap on mount. */
export function useTelegramBootstrap() {
  const setInit = useScanner((s) => s.setInitData);
  const setDevTgId = useScanner((s) => s.setDevTgId);
  const bootstrap = useScanner((s) => s.bootstrap);
  const ready = useScanner((s) => s.ready);
  const initData = useScanner((s) => s.initData);
  const devTgId = useScanner((s) => s.devTgId);


  useEffect(() => {
    // telegram-web-app.js is loaded async, so poll until Telegram.WebApp
    // exposes initData (or give up after ~5s and fall back to devTgId).
    if (typeof window === "undefined") return;
    let cancelled = false;
    let tries = 0;
    const poll = () => {
      if (cancelled) return;
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initData && tg.initData.length > 0) {
        try { tg.ready?.(); tg.expand?.(); } catch { /* noop */ }
        setInit(tg.initData);
        return;
      }
      if (tg && tries > 4) {
        // WebApp object exists but initData empty (opened outside a bot, or
        // Telegram Desktop preview). Fall back to initDataUnsafe.user.id so
        // the user can still use the app.
        try { tg.ready?.(); tg.expand?.(); } catch { /* noop */ }
        const uid = tg.initDataUnsafe?.user?.id;
        if (uid) setDevTgId(Number(uid));
        return;
      }
      if (tries++ < 20) setTimeout(poll, 250);
    };
    poll();
    return () => { cancelled = true; };
  }, [setInit, setDevTgId]);


  useEffect(() => {
    if (!ready && (initData || devTgId)) {
      bootstrap();
    }
  }, [initData, devTgId, ready, bootstrap]);
}


// ---- selectors / helpers ----

export function totalUsd(bal: Balances): number {
  let t = 0;
  for (const c of COIN_LIST) t += (bal[c] || 0) * COINS[c].price;
  return t;
}

export function activeTokens(bal: Balances): number {
  let n = 0;
  for (const c of COIN_LIST) if ((bal[c] || 0) > 0) n++;
  return n;
}

export { DAILY_TON };
