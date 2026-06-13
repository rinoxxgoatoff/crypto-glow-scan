import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COIN_LIST, COINS, type CoinSym } from "./coins";

export interface RewardEntry {
  id: string;
  ts: number;
  sym: CoinSym;
  amount: number;
  usd: number;
}

type Balances = Record<CoinSym, number>;

interface ScannerState {
  bal: Balances;
  earned: number;
  sessions: number;
  hasMiner: boolean;
  uid: string;
  bonusDay: number;
  lastBonus: string | null;
  history: RewardEntry[];

  addReward: (sym: CoinSym, amount: number, usd: number) => void;
  startSession: () => void;
  buyMiner: () => void;
  claimBonus: () => { day: number; tonAmount: number } | null;
  swap: (from: CoinSym, to: CoinSym, fromAmount: number) => boolean;
  resetAll: () => void;
}

const emptyBal = (): Balances =>
  COIN_LIST.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Balances);

const DAILY_TON = [0.1, 0.2, 0.3, 0.5, 0.75, 1, 2];
const randId = () => Math.random().toString(36).slice(2, 10);

export const useScanner = create<ScannerState>()(
  persist(
    (set, get) => ({
      bal: emptyBal(),
      earned: 0,
      sessions: 0,
      hasMiner: false,
      uid: String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)),
      bonusDay: 1,
      lastBonus: null,
      history: [],

      addReward: (sym, amount, usd) =>
        set((s) => ({
          bal: { ...s.bal, [sym]: (s.bal[sym] || 0) + amount },
          earned: s.earned + usd,
          history: [{ id: randId(), ts: Date.now(), sym, amount, usd }, ...s.history].slice(0, 50),
        })),

      startSession: () => set((s) => ({ sessions: s.sessions + 1 })),

      buyMiner: () => set({ hasMiner: true }),

      claimBonus: () => {
        const today = new Date().toDateString();
        const s = get();
        if (s.lastBonus === today) return null;
        const day = s.bonusDay;
        const ton = DAILY_TON[(day - 1) % 7];
        set({
          bal: { ...s.bal, TON: s.bal.TON + ton },
          earned: s.earned + ton * COINS.TON.price,
          bonusDay: Math.min(day + 1, 7),
          lastBonus: today,
        });
        return { day, tonAmount: ton };
      },

      swap: (from, to, fromAmount) => {
        const s = get();
        if (from === to || fromAmount <= 0) return false;
        if ((s.bal[from] || 0) < fromAmount) return false;
        const rate = COINS[from].price / COINS[to].price;
        const out = fromAmount * rate;
        set({
          bal: {
            ...s.bal,
            [from]: s.bal[from] - fromAmount,
            [to]: (s.bal[to] || 0) + out,
          },
        });
        return true;
      },

      resetAll: () =>
        set({
          bal: emptyBal(),
          earned: 0,
          sessions: 0,
          hasMiner: false,
          bonusDay: 1,
          lastBonus: null,
          history: [],
        }),
    }),
    {
      name: "scanner-crypto-v6",
      version: 1,
    },
  ),
);

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
