import { useMemo, useState } from "react";
import { ArrowDownUp, ChevronDown, Repeat } from "lucide-react";
import { toast } from "sonner";
import { COINS, type CoinSym } from "@/lib/scanner/coins";
import { useScanner } from "@/lib/scanner/state";
import { formatAmount } from "@/lib/scanner/format";
import { TokenIcon } from "./TokenIcon";

const SWAPPABLE: CoinSym[] = ["BTC", "ETH", "SOL", "USDT", "TON", "XRP", "BNB", "DOGE"];

export function SwapBox() {
  const bal = useScanner((s) => s.bal);
  const doSwap = useScanner((s) => s.swap);

  const [from, setFrom] = useState<CoinSym>("BTC");
  const [to, setTo] = useState<CoinSym>("TON");
  const [amount, setAmount] = useState("0");

  const rate = useMemo(() => COINS[from].price / COINS[to].price, [from, to]);
  const received = (parseFloat(amount) || 0) * rate;

  const cycle = (cur: CoinSym, setter: (c: CoinSym) => void) => {
    const i = SWAPPABLE.indexOf(cur);
    setter(SWAPPABLE[(i + 1) % SWAPPABLE.length]);
  };

  const flip = () => {
    const a = from;
    setFrom(to);
    setTo(a);
  };

  const exec = async () => {
    const v = parseFloat(amount);
    if (!v || v <= 0) return toast.error("Enter an amount");
    const ok = await doSwap(from, to, v);
    if (!ok) return toast.error(`Insufficient ${from} balance`);
    toast.success(`Swapped ${v} ${from} → ${(v * rate).toFixed(6)} ${to}`);
    setAmount("0");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">You send</div>
        <SwapInput
          value={amount}
          onChange={setAmount}
          sym={from}
          onPickSym={() => cycle(from, setFrom)}
          balance={bal[from]}
        />
      </div>

      <div className="-my-1 flex justify-center">
        <button
          onClick={flip}
          className="grid h-9 w-9 place-items-center rounded-full border bg-surface-2 transition-transform hover:rotate-180"
          style={{ borderColor: "var(--border)", color: "var(--mint)" }}
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">You receive</div>
        <SwapInput
          value={received ? received.toFixed(6) : "0"}
          onChange={() => {}}
          sym={to}
          onPickSym={() => cycle(to, setTo)}
          balance={bal[to]}
          readOnly
        />
      </div>

      <div className="my-2 text-center text-[11px] text-muted-foreground">
        1 {from} ≈ {rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
      </div>

      <button
        onClick={exec}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all"
        style={{
          background: "linear-gradient(135deg, var(--mint), var(--mint-deep))",
          color: "var(--primary-foreground)",
          boxShadow: "0 4px 18px color-mix(in oklab, var(--mint) 32%, transparent)",
        }}
      >
        <Repeat className="h-4 w-4" /> Swap Now
      </button>
    </section>
  );
}

function SwapInput({
  value,
  onChange,
  sym,
  onPickSym,
  balance,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  sym: CoinSym;
  onPickSym: () => void;
  balance: number;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 transition-colors focus-within:border-mint">
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          readOnly={readOnly}
          className="text-mono w-full bg-transparent text-xl font-black outline-none"
        />
        <button
          onClick={onPickSym}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-surface-3 px-2.5 py-1.5 text-xs font-bold"
          style={{ borderColor: "var(--border)" }}
        >
          <TokenIcon sym={sym} size={20} />
          {sym}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        Balance: <span className="text-mono">{formatAmount(balance)}</span> {sym}
      </div>
    </div>
  );
}
