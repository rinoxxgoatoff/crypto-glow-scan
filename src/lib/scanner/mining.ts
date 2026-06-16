import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { COINS, MINEABLE, type CoinSym } from "./coins";
import { useScanner } from "./state";
import { getBoostState } from "./api.functions";
import { pad2 } from "./format";

export interface TermLine {
  id: string;
  ts: number;
  text: string;
  reward?: boolean;
}

const LOGS = [
  "[GPU:0] temp=58C fan=60% pwr=124W rate~31MH",
  "[MEM] vram=22.0/24.0GB sys=4.0/16GB stable",
  "[NET] up=1.6KB/s down=1.3KB/s rtt=20ms ok",
  "[POOL] share accepted difficulty 972 t/s",
  "[POOL] connection stable scanner.io:3333",
  "[SCAN] block validated no conflicts found",
  "[HASH] nonce batch complete iteration ok",
  "[GPU:0] efficiency 98.2% power state P0",
  "[NET] peer latency 18ms bandwidth nominal",
  "[POOL] heartbeat ok queue depth 2",
  "[GPU:0] fan adjusted thermal management ok",
  "[MEM] buffer flush ok no overflow detected",
];

function timeStamp(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const MAX_LINES = 9;

export function useMining() {
  const [mining, setMining] = useState(false);
  const [lines, setLines] = useState<TermLine[]>([]);
  const [hashRate, setHashRate] = useState<number>(0);
  const addReward = useScanner((s) => s.addReward);
  const startSession = useScanner((s) => s.startSession);
  const hasMiner = useScanner((s) => s.me?.has_miner ?? false);
  const initData = useScanner((s) => s.initData);
  const devTgId = useScanner((s) => s.devTgId);
  const boostQ = useQuery({
    queryKey: ["boost-state"],
    queryFn: () => getBoostState({ data: { initData, devTgId: devTgId ?? undefined } }),
    refetchInterval: 30_000,
  });
  const logIdx = useRef(0);
  const logTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = boostQ.data?.active;
  const boostMult =
    active && new Date(active.expires_at).getTime() > Date.now() ? Number(active.multiplier) || 1 : 1;
  const base = (hasMiner ? 75 : 31.5) * boostMult;

  useEffect(() => {
    setHashRate(base);
  }, [base]);

  const addLine = useCallback((text: string, reward = false) => {
    setLines((prev) => {
      const next: TermLine = {
        id: Math.random().toString(36).slice(2, 9),
        ts: Date.now(),
        text: `> [${timeStamp()}] ${text}`,
        reward,
      };
      const out = [...prev, next];
      return out.length > MAX_LINES ? out.slice(out.length - MAX_LINES) : out;
    });
  }, []);

  const scheduleReward = useCallback(() => {
    const delay = (4000 + Math.random() * 4000) / Math.max(1, boostMult);
    rewardTimer.current = setTimeout(() => {
      const sym = MINEABLE[Math.floor(Math.random() * MINEABLE.length)] as CoinSym;
      const usd = (0.1 + Math.random() * 0.28) * boostMult;
      const amount = usd / COINS[sym].price;
      addReward(sym, amount, usd);
      addLine(
        `[REWARD] +${amount.toFixed(8)} ${sym} ($${usd.toFixed(2)})${boostMult > 1 ? ` ×${boostMult} BOOST` : ""}`,
        true,
      );
      setHashRate(+(base + (Math.random() * 0.6 - 0.3)).toFixed(1));
      scheduleReward();
    }, delay);
  }, [addReward, addLine, base, boostMult]);

  const start = useCallback(() => {
    if (mining) return;
    setMining(true);
    startSession();
    setLines([]);
    logIdx.current = 0;
    logTimer.current = setInterval(() => {
      if (Math.random() > 0.35) {
        addLine(LOGS[logIdx.current % LOGS.length]);
        logIdx.current++;
      }
    }, 1200);
    scheduleReward();
  }, [mining, startSession, addLine, scheduleReward]);

  const stop = useCallback(() => {
    setMining(false);
    if (logTimer.current) clearInterval(logTimer.current);
    if (rewardTimer.current) clearTimeout(rewardTimer.current);
    setLines([]);
    setHashRate(base);
  }, [base]);

  useEffect(() => {
    return () => {
      if (logTimer.current) clearInterval(logTimer.current);
      if (rewardTimer.current) clearTimeout(rewardTimer.current);
    };
  }, []);

  return { mining, lines, hashRate, base, start, stop, toggle: () => (mining ? stop() : start()) };
}
