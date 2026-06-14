import { createFileRoute } from "@tanstack/react-router";
import { Copy, RotateCcw, Rocket } from "lucide-react";
import { toast } from "sonner";
import { TokenList } from "@/components/scanner/TokenList";
import { activeTokens, totalUsd, useScanner } from "@/lib/scanner/state";
import { formatUsd } from "@/lib/scanner/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Scanner Crypto" },
      { name: "description", content: "Your mining profile, balances and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const me = useScanner((s) => s.me);
  const uid = String(me?.tg_id ?? "—");
  const earned = me?.earned_usd ?? 0;
  const sessions = me?.sessions ?? 0;
  const hasMiner = me?.has_miner ?? false;
  const bal = useScanner((s) => s.bal);
  const reset = useScanner((s) => s.resetAll);

  const total = totalUsd(bal);
  const active = activeTokens(bal);

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      toast.success("User ID copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="relative">
          <div
            className="grid h-[70px] w-[70px] place-items-center rounded-2xl border-2 text-3xl"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--mint)",
              boxShadow: "0 0 24px color-mix(in oklab, var(--mint) 25%, transparent)",
            }}
          >
            <Rocket className="h-7 w-7" style={{ color: "var(--mint)" }} />
          </div>
        </div>
        <div className="text-lg font-black">Scanner User</div>
        <div className="text-xs text-muted-foreground">@scanner_user</div>
        <button
          onClick={copyUid}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:border-mint"
        >
          ID: <span className="text-mono">{uid}</span>
          <Copy className="h-3 w-3" />
        </button>
      </div>

      <section
        className="rounded-2xl border p-5 text-center"
        style={{
          background: "linear-gradient(150deg, var(--card), var(--surface-2))",
          borderColor: "color-mix(in oklab, var(--mint) 28%, transparent)",
        }}
      >
        <div className="mb-1 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          Total balance
        </div>
        <div className="text-mono text-4xl font-black" style={{ color: "var(--mint)" }}>
          {formatUsd(total)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total mined" value={formatUsd(earned)} />
        <StatCard label="Sessions" value={String(sessions)} />
        <StatCard label="Mining rig" value={hasMiner ? "Basic" : "None"} dim={!hasMiner} />
        <StatCard label="Active tokens" value={String(active)} />
      </div>

      <TokenList />

      <Button
        variant="secondary"
        className="mt-1 w-full"
        onClick={() => {
          if (confirm("Reset all demo data?")) {
            reset();
            toast.success("Demo data reset");
          }
        }}
      >
        <RotateCcw className="h-4 w-4" /> Reset demo data
      </Button>
    </div>
  );
}

function StatCard({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div
        className="text-lg font-black"
        style={{ color: dim ? "var(--muted-foreground)" : "var(--mint)" }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
