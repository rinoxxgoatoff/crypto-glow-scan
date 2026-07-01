import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";
import { useScanner } from "@/lib/scanner/state";
import { claimAdBoost, getBoostState } from "@/lib/scanner/api.functions";

type AdController = {
  show: () => Promise<{ done: boolean; error?: boolean; description?: string } | void>;
};
type AdsgramFactory = (opts: { blockId: string }) => AdController;

declare global {
  interface Window {
    Adsgram?: AdsgramFactory;
  }
}

function fmt(sec: number) {
  if (sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BoostButton() {
  const initData = useScanner((s) => s.initData);
  const devTgId = useScanner((s) => s.devTgId);
  const qc = useQueryClient();
  const adRef = useRef<AdController | null>(null);
  const [now, setNow] = useState(Date.now());

  const stateQ = useQuery({
    queryKey: ["boost-state"],
    queryFn: () => getBoostState({ data: { initData, devTgId: devTgId ?? undefined } }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const blockId = stateQ.data?.config.adsgram_block_id;
    if (!blockId || adRef.current) return;
    let cancelled = false;
    let tries = 0;
    const tryInit = () => {
      if (cancelled) return;
      if (window.Adsgram) {
        try {
          adRef.current = window.Adsgram({ blockId });
        } catch (e) {
          console.warn("Adsgram init failed", e);
        }
      } else if (tries++ < 40) {
        setTimeout(tryInit, 500);
      }
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [stateQ.data?.config.adsgram_block_id]);

  const claim = useMutation({
    mutationFn: () => claimAdBoost({ data: { initData, devTgId: devTgId ?? undefined } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Boost ×${res.multiplier} activé !`);
        qc.invalidateQueries({ queryKey: ["boost-state"] });
      } else if (res.reason === "cooldown") {
        toast.error(`Cooldown — réessaie dans ${fmt(res.retry_in_sec ?? 0)}`);
      } else {
        toast.error("Boost indisponible");
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const waitForAdsgram = async (blockId: string, maxMs = 3000): Promise<AdController | null> => {
    if (adRef.current) return adRef.current;
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (window.Adsgram) {
        try {
          adRef.current = window.Adsgram({ blockId });
          return adRef.current;
        } catch (e) {
          console.warn("Adsgram init failed", e);
          return null;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  };

  const onClick = async () => {
    const blockId = stateQ.data?.config.adsgram_block_id;
    const ad = blockId ? await waitForAdsgram(blockId) : null;
    if (!ad) {
      // SDK absent (preview navigateur, ad-blocker, hors Telegram) — on accorde
      // le boost directement ; le cooldown serveur empêche tout abus.
      claim.mutate();
      return;
    }

    try {
      const r = await ad.show();
      if (r && (r as any).error) {
        toast.error((r as any).description || "Pub interrompue");
        return;
      }
      claim.mutate();
    } catch (e: any) {
      if (e?.description) toast.error(e.description);
      else toast.error("Pub interrompue");
    }
  };

  if (!stateQ.data?.config.enabled) return null;

  const active = stateQ.data.active;
  const isActive = active && new Date(active.expires_at).getTime() > now;
  const remaining = isActive ? Math.max(0, Math.floor((new Date(active!.expires_at).getTime() - now) / 1000)) : 0;
  const cooldownMin = stateQ.data.config.cooldown_min;
  const lastView = stateQ.data.last_view_at ? new Date(stateQ.data.last_view_at).getTime() : 0;
  const cooldownLeft = lastView ? Math.max(0, Math.floor((lastView + cooldownMin * 60_000 - now) / 1000)) : 0;
  const disabled = claim.isPending || cooldownLeft > 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-60"
      style={{
        background:
          "linear-gradient(120deg, color-mix(in oklab, var(--violet) 18%, transparent), color-mix(in oklab, var(--mint) 14%, transparent))",
        borderColor: "color-mix(in oklab, var(--violet) 40%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{
            background: "color-mix(in oklab, var(--violet) 25%, transparent)",
            color: "var(--violet)",
          }}
        >
          {claim.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-black">
            BOOST ×{stateQ.data.config.multiplier}
            {isActive && (
              <span
                className="rounded-full px-1.5 py-[1px] text-[9px] font-bold"
                style={{ background: "color-mix(in oklab, var(--mint) 22%, transparent)", color: "var(--mint)" }}
              >
                ACTIF
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isActive
              ? `Boost actif · expire dans ${fmt(remaining)}`
              : cooldownLeft > 0
                ? `Cooldown · ${fmt(cooldownLeft)}`
                : `Regarde une pub · +${stateQ.data.config.duration_min} min de hashrate ×${stateQ.data.config.multiplier}`}
          </div>
        </div>
      </div>
    </button>
  );
}
