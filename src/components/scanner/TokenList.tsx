import { ArrowUpRight, Wallet } from "lucide-react";
import { COIN_LIST, COINS } from "@/lib/scanner/coins";
import { formatAmount, formatUsd } from "@/lib/scanner/format";
import { totalUsd, useScanner } from "@/lib/scanner/state";
import { TokenIcon } from "./TokenIcon";

interface Props {
  withWithdraw?: boolean;
  onWithdraw?: (sym: keyof typeof COINS) => void;
}

export function TokenList({ withWithdraw, onWithdraw }: Props) {
  const bal = useScanner((s) => s.bal);
  const total = totalUsd(bal);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl border"
            style={{ background: "var(--mint-soft)", borderColor: "color-mix(in oklab, var(--mint) 30%, transparent)" }}
          >
            <Wallet className="h-4 w-4" style={{ color: "var(--mint)" }} />
          </div>
          <div>
            <div className="text-sm font-extrabold">My Balances</div>
            <div className="text-[11px] text-muted-foreground">{COIN_LIST.length} tokens</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-mono text-lg font-black" style={{ color: "var(--mint)" }}>
            {formatUsd(total)}
          </div>
          <div className="text-[10px] text-muted-foreground">Total value</div>
        </div>
      </div>

      <div>
        {COIN_LIST.map((sym) => {
          const c = COINS[sym];
          const amount = bal[sym] || 0;
          const usd = amount * c.price;
          return (
            <div
              key={sym}
              className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0"
            >
              <div className="flex items-center gap-2.5">
                <TokenIcon sym={sym} size={36} />
                <div>
                  <div className="text-[13px] font-extrabold">{sym}</div>
                  <div className="text-[11px] text-muted-foreground">{c.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-mono text-[11.5px] font-bold">{formatAmount(amount)}</div>
                  <div
                    className="text-[11px]"
                    style={{ color: amount === 0 ? "var(--muted-foreground)" : "var(--mint)" }}
                  >
                    {formatUsd(usd)}
                  </div>
                </div>
                {withWithdraw && (
                  <button
                    type="button"
                    onClick={() => onWithdraw?.(sym)}
                    className="grid h-8 w-8 place-items-center rounded-lg border transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "color-mix(in oklab, var(--mint) 22%, transparent)",
                      color: "var(--mint)",
                    }}
                    title={`Withdraw ${sym}`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
