import { useState } from "react";
import { Check, Copy, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PAY_ADDRESSES } from "@/lib/scanner/coins";
import { shortAddr } from "@/lib/scanner/format";
import { TokenIcon } from "./TokenIcon";

const PAY_OPTIONS = [
  { key: "BTC" as const, sym: "Bitcoin (BTC)", equiv: "≈ 0.000784 BTC" },
  { key: "ETH" as const, sym: "Ethereum (ETH)", equiv: "≈ 0.02315 ETH" },
  { key: "SOL" as const, sym: "Solana (SOL)", equiv: "≈ 0.352 SOL" },
];

interface Props {
  onIvePaid: () => void;
}

export function MinerShop({ onIvePaid }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (k: keyof typeof PAY_ADDRESSES) => {
    try {
      await navigator.clipboard.writeText(PAY_ADDRESSES[k]);
      setCopied(k);
      toast.success(`${k} address copied`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <h2 className="text-xl font-black">⛏️ Mining Rig</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Buy a rig to boost speed & unlock withdrawals
        </p>
      </div>

      <section
        className="rounded-2xl border p-5"
        style={{
          background: "linear-gradient(150deg, var(--surface-2), var(--surface-3))",
          borderColor: "color-mix(in oklab, var(--mint) 28%, transparent)",
        }}
      >
        <div className="mb-2 text-center text-4xl">🖥️</div>
        <div className="text-center text-lg font-black">Basic Mining Rig</div>
        <p className="mx-auto mt-1.5 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
          Verify you're human & unlock withdrawals.
          <br />
          Boosts speed from <b>31.5 → 75 MH/s</b>.
        </p>

        <div className="my-4 text-center">
          <div className="text-mono text-4xl font-black" style={{ color: "var(--mint)" }}>
            $50
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            One-time · Permanent · Instant activation
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {PAY_OPTIONS.map((p) => (
            <div
              key={p.key}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <TokenIcon sym={p.key} size={32} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold">{p.sym}</div>
                <div className="text-[10px] text-muted-foreground">{p.equiv}</div>
                <div className="text-mono mt-0.5 truncate text-[9px] text-muted-foreground">
                  {shortAddr(PAY_ADDRESSES[p.key])}
                </div>
              </div>
              <button
                onClick={() => copy(p.key)}
                className="flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-all"
                style={
                  copied === p.key
                    ? { background: "var(--mint)", color: "var(--primary-foreground)", borderColor: "var(--mint)" }
                    : {
                        background: "color-mix(in oklab, var(--mint) 8%, transparent)",
                        color: "var(--mint)",
                        borderColor: "color-mix(in oklab, var(--mint) 22%, transparent)",
                      }
                }
              >
                {copied === p.key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === p.key ? "Done" : "Copy"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onIvePaid}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-extrabold transition-all"
          style={{ borderColor: "var(--mint)", color: "var(--mint)", background: "transparent" }}
        >
          <Check className="h-4 w-4" /> I've sent the payment
        </button>
      </section>

      <div
        className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-[11.5px] leading-relaxed text-muted-foreground"
      >
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        After payment confirmation, your rig activates and withdrawals unlock.
        Processed in under 10 min.
      </div>
    </div>
  );
}

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ContactSheet({ open, onOpenChange }: ContactSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t-mint">
        <SheetHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">✅</div>
          <SheetTitle className="text-center text-lg">Paiement envoyé ?</SheetTitle>
          <SheetDescription className="text-center text-xs">
            Pour débloquer votre mineur, envoyez un message à{" "}
            <b style={{ color: "var(--mint)" }}>@rinoxx11</b> sur Telegram avec une capture
            d'écran de votre transaction.
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
          <li>📸 Joignez une capture d'écran de la transaction</li>
          <li>✉️ Envoyez-la à <b style={{ color: "var(--mint)" }}>@rinoxx11</b> sur Telegram</li>
          <li>⚡ Activation sous 10 minutes après vérification</li>
        </ul>

        <a
          href="https://t.me/rinoxx11"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold"
          style={{
            background: "linear-gradient(135deg, var(--mint), var(--mint-deep))",
            color: "var(--primary-foreground)",
          }}
        >
          <Send className="h-4 w-4" /> Contacter @rinoxx11
        </a>
      </SheetContent>
    </Sheet>
  );
}
