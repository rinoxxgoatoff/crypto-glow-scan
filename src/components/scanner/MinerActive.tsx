import { ShieldCheck } from "lucide-react";
import { useScanner } from "@/lib/scanner/state";
import { formatUsd } from "@/lib/scanner/format";

export function MinerActive() {
  const earned = useScanner((s) => s.me?.earned_usd ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <h2 className="text-xl font-black">⛏️ Mining Rig</h2>
        <p className="mt-1 text-xs text-muted-foreground">Your mining rig is active</p>
      </div>

      <section
        className="rounded-2xl border p-5 text-center"
        style={{
          background:
            "linear-gradient(150deg, color-mix(in oklab, var(--mint) 7%, transparent), color-mix(in oklab, var(--violet) 4%, transparent))",
          borderColor: "color-mix(in oklab, var(--mint) 32%, transparent)",
        }}
      >
        <div className="mb-2 text-4xl">🖥️</div>
        <div
          className="mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold"
          style={{
            background: "color-mix(in oklab, var(--mint) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--mint) 32%, transparent)",
            color: "var(--mint)",
          }}
        >
          <ShieldCheck className="h-3 w-3" /> ACTIVE
        </div>
        <div className="text-base font-black">Basic Mining Rig</div>
        <div className="text-[11px] text-muted-foreground">Withdrawals unlocked · 75 MH/s</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Hash Rate" value="75 MH/s" />
          <Stat label="Speed" value="2.4×" />
          <Stat label="Total Mined" value={formatUsd(earned)} />
          <Stat label="Status" value="Verified ✓" />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <div className="text-base font-black" style={{ color: "var(--mint)" }}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
