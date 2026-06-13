import { useEffect, useState } from "react";
import { Cpu, Activity, DollarSign, Play, Square } from "lucide-react";
import type { TermLine } from "@/lib/scanner/mining";
import { useScanner } from "@/lib/scanner/state";
import { formatUsd } from "@/lib/scanner/format";

interface Props {
  mining: boolean;
  lines: TermLine[];
  hashRate: number;
  base: number;
  onToggle: () => void;
}

export function ScannerTerminal({ mining, lines, hashRate, base, onToggle }: Props) {
  const earned = useScanner((s) => s.earned);
  const [reward, setReward] = useState<string | null>(null);

  useEffect(() => {
    const last = lines[lines.length - 1];
    if (last?.reward) {
      const m = last.text.match(/\+([\d.]+)\s+(\w+)/);
      if (m) {
        setReward(`💰 +${m[1]} ${m[2]}`);
        const t = setTimeout(() => setReward(null), 2600);
        return () => clearTimeout(t);
      }
    }
  }, [lines]);

  return (
    <section
      className="relative rounded-2xl border bg-card p-4 transition-shadow"
      style={{
        borderColor: mining ? "color-mix(in oklab, var(--mint) 30%, transparent)" : "var(--border)",
        boxShadow: mining ? "var(--shadow-glow)" : "var(--shadow-card)",
      }}
    >
      {/* Title */}
      <div className="mb-3 pb-1 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          <span className="text-foreground">Scanner</span>{" "}
          <span style={{ color: "var(--mint)", textShadow: "0 0 22px color-mix(in oklab, var(--mint) 55%, transparent)" }}>
            Crypto
          </span>
        </h1>
        <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          Cloud Mining Platform v2.5
        </p>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatBox icon={<Cpu className="h-[18px] w-[18px]" />} value={hashRate.toFixed(1)} label="MH/S" />
        <StatBox
          icon={<Activity className="h-[18px] w-[18px]" />}
          value={mining ? "● LIVE" : "● OFF"}
          label="STATUS"
          mono
          highlight={mining}
        />
        <StatBox icon={<DollarSign className="h-[18px] w-[18px]" />} value={formatUsd(earned)} label="EARNED" />
      </div>

      {/* Terminal */}
      <div
        className={`mb-3 overflow-hidden rounded-xl border transition-colors ${mining ? "scan-line" : ""}`}
        style={{
          background: "var(--terminal)",
          borderColor: mining
            ? "color-mix(in oklab, var(--mint) 45%, transparent)"
            : "color-mix(in oklab, var(--mint) 18%, transparent)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-mono text-[10px] text-muted-foreground">scanner-mining-v2.5.1</span>
          <div className="flex items-center gap-1.5 text-[10px] text-mono">
            <span
              className={`h-[7px] w-[7px] rounded-full ${mining ? "pulse-mint" : ""}`}
              style={{ background: mining ? "var(--mint)" : "var(--muted-foreground)" }}
            />
            {mining ? "MINING" : "IDLE"}
          </div>
        </div>

        <div className="text-mono h-[148px] overflow-hidden px-3 py-2 text-[10.5px] leading-[1.62]">
          {lines.length === 0 ? (
            <div style={{ color: "color-mix(in oklab, var(--mint) 35%, var(--muted-foreground))" }}>
              $ Waiting for start command...
              <span
                className="ml-1 inline-block h-3 w-[7px] animate-pulse align-middle"
                style={{ background: "var(--mint)" }}
              />
            </div>
          ) : (
            lines.map((l) => (
              <div
                key={l.id}
                className="anim-slide-up overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  color: l.reward
                    ? "var(--mint)"
                    : "color-mix(in oklab, var(--mint) 50%, var(--muted-foreground))",
                  fontWeight: l.reward ? 600 : 400,
                }}
              >
                {l.text}
              </div>
            ))
          )}
        </div>

        {mining && (
          <div className="text-mono flex justify-between border-t border-white/5 px-3 py-1.5 text-[9px] text-muted-foreground">
            <span>⊟ Pool: scanner.io · GPU#0</span>
            <span>{hashRate.toFixed(1)} MH/s</span>
          </div>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-black transition-all"
        style={
          mining
            ? {
                background: "linear-gradient(135deg, var(--rose), oklch(0.55 0.20 18))",
                color: "white",
                boxShadow: "0 4px 16px color-mix(in oklab, var(--rose) 35%, transparent)",
              }
            : {
                background: "linear-gradient(135deg, var(--mint), var(--mint-deep))",
                color: "var(--primary-foreground)",
                boxShadow: "0 4px 20px color-mix(in oklab, var(--mint) 35%, transparent)",
              }
        }
      >
        {mining ? (
          <>
            <Square className="h-4 w-4 fill-current" /> Stop Mining
          </>
        ) : (
          <>
            <Play className="h-4 w-4 fill-current" /> Start Mining
          </>
        )}
      </button>

      {/* Floating reward */}
      {reward && (
        <div
          className="anim-slide-up pointer-events-none absolute right-3 top-3 rounded-lg border px-3 py-1.5 text-xs font-bold"
          style={{
            background: "color-mix(in oklab, var(--mint) 12%, var(--surface-2))",
            borderColor: "color-mix(in oklab, var(--mint) 45%, transparent)",
            color: "var(--mint)",
          }}
        >
          {reward}
        </div>
      )}
    </section>
  );
}

function StatBox({
  icon,
  value,
  label,
  mono,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border bg-surface-2 px-2 py-3 transition-all"
      style={{
        borderColor: highlight ? "color-mix(in oklab, var(--mint) 35%, transparent)" : "var(--border)",
        boxShadow: highlight ? "0 0 14px color-mix(in oklab, var(--mint) 18%, transparent)" : undefined,
      }}
    >
      <span style={{ color: highlight ? "var(--mint)" : "var(--muted-foreground)" }}>{icon}</span>
      <span
        className={`font-black ${mono ? "text-mono text-xs" : "text-[15px]"}`}
        style={{ color: highlight ? "var(--mint)" : undefined }}
      >
        {value}
      </span>
      <span className="text-[8.5px] tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
