import { Check, Gem, Gift, Flame } from "lucide-react";
import { toast } from "sonner";
import { DAILY_TON, useScanner } from "@/lib/scanner/state";

export function DailyBonus() {
  const bonusDay = useScanner((s) => s.me?.bonus_day ?? 1);
  const lastBonus = useScanner((s) => s.me?.last_bonus ?? null);
  const claim = useScanner((s) => s.claimBonus);

  const today = new Date().toISOString().slice(0, 10);
  const claimed = lastBonus === today;

  const onClaim = async () => {
    const r = await claim();
    if (r) toast.success(`Bonus claimed: +${r.tonAmount} TON`);
    else toast.error("Already claimed today");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl border text-lg"
            style={{ background: "var(--mint-soft)", borderColor: "color-mix(in oklab, var(--mint) 30%, transparent)" }}
          >
            <Gift className="h-5 w-5" style={{ color: "var(--mint)" }} />
          </div>
          <div>
            <div className="text-sm font-extrabold">Daily Bonus</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              7-day streak reward
            </div>
          </div>
        </div>
        <span
          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{
            color: "var(--violet)",
            background: "color-mix(in oklab, var(--violet) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--violet) 30%, transparent)",
          }}
        >
          <Flame className="h-3 w-3" /> {bonusDay}d
        </span>
      </div>

      <div className="mb-3 flex gap-1.5">
        {DAILY_TON.map((v, i) => {
          const done = i < bonusDay - 1;
          const current = i === bonusDay - 1 && !claimed;
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg border bg-surface-2 px-1 py-2"
              style={{
                borderColor: done
                  ? "var(--mint)"
                  : current
                    ? "color-mix(in oklab, var(--mint) 40%, transparent)"
                    : "var(--border)",
                background: done ? "color-mix(in oklab, var(--mint) 8%, transparent)" : undefined,
              }}
            >
              {done ? (
                <Check className="h-3 w-3" style={{ color: "var(--mint)" }} />
              ) : (
                <Gem className="h-3 w-3" style={{ color: current ? "var(--mint)" : "var(--muted-foreground)" }} />
              )}
              <span className="text-[10px] font-bold" style={{ color: done ? "var(--mint)" : undefined }}>
                {v}
              </span>
              <span className="text-[8px] text-muted-foreground">D{i + 1}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClaim}
        disabled={claimed}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all disabled:cursor-default disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, var(--mint), var(--mint-deep))",
          color: "var(--primary-foreground)",
          boxShadow: claimed ? "none" : "0 4px 18px color-mix(in oklab, var(--mint) 35%, transparent)",
        }}
      >
        {claimed ? "🔒 Come back tomorrow" : "🎁 Claim Daily Reward"}
      </button>
    </section>
  );
}
