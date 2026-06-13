import { createFileRoute } from "@tanstack/react-router";
import { Clock, History } from "lucide-react";
import { SwapBox } from "@/components/scanner/SwapBox";
import { useScanner } from "@/lib/scanner/state";
import { COINS } from "@/lib/scanner/coins";
import { formatAmount, formatUsd } from "@/lib/scanner/format";

export const Route = createFileRoute("/swap")({
  head: () => ({
    meta: [
      { title: "Swap — Scanner Crypto" },
      { name: "description", content: "Instantly swap between your mined tokens at live mock rates." },
    ],
  }),
  component: SwapPage,
});

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SwapPage() {
  const history = useScanner((s) => s.history);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="text-center">
        <h1 className="text-xl font-black">Swap Tokens</h1>
        <p className="mt-1 text-xs text-muted-foreground">Exchange your mined crypto instantly</p>
      </div>

      <SwapBox />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <History className="h-4 w-4" style={{ color: "var(--mint)" }} /> Mining History
        </div>
        {history.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-center text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> No rewards yet — start mining to see them here.
          </div>
        ) : (
          <ul className="flex flex-col">
            {history.slice(0, 12).map((h) => {
              const c = COINS[h.sym];
              return (
                <li
                  key={h.id}
                  className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="grid h-8 w-8 place-items-center rounded-full text-xs font-black text-white"
                      style={{ background: c.color }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <div className="text-[12px] font-bold">+{formatAmount(h.amount)} {h.sym}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(h.ts)}</div>
                    </div>
                  </div>
                  <div className="text-mono text-[12px] font-bold" style={{ color: "var(--mint)" }}>
                    {formatUsd(h.usd)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
