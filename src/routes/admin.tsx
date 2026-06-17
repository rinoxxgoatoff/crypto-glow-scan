import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, Search, Users, Pickaxe, DollarSign, Activity,
  Zap, Eye, TrendingUp, Save, Plus, Minus,
} from "lucide-react";
import { useScanner } from "@/lib/scanner/state";
import {
  adminListUsers, adminToggleMiner, adminGetSettings,
  adminUpdateBoostConfig, adminGetStats, adminAdjustEarned,
  adminGetBoostHistory,
} from "@/lib/scanner/api.functions";
import { formatUsd } from "@/lib/scanner/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Scanner Crypto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isAdmin = useScanner((s) => s.me?.is_admin ?? false);
  const initData = useScanner((s) => s.initData);
  const devTgId = useScanner((s) => s.devTgId);
  const auth = { initData, devTgId: devTgId ?? undefined };
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"users" | "ads" | "boosts" | "settings">("users");

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminListUsers({ data: auth }),
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminGetStats({ data: auth }),
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { tgId: number; hasMiner: boolean }) =>
      adminToggleMiner({ data: { ...auth, ...vars } }),
    onSuccess: () => { toast.success("Updated"); usersQuery.refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const adjustMutation = useMutation({
    mutationFn: (vars: { tgId: number; deltaUsd: number }) =>
      adminAdjustEarned({ data: { ...auth, ...vars } }),
    onSuccess: () => { toast.success("Balance updated"); usersQuery.refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="text-lg font-bold">Admin only</h1>
        <p className="text-xs text-muted-foreground">Your account is not authorized.</p>
      </div>
    );
  }

  const users = usersQuery.data ?? [];
  const filtered = users.filter((u) => {
    const s = `${u.username ?? ""} ${u.first_name ?? ""} ${u.last_name ?? ""} ${u.tg_id}`.toLowerCase();
    return !q || s.includes(q.toLowerCase());
  });

  const totalUsers = users.length;
  const withMiner = users.filter((u) => u.has_miner).length;
  const totalMined = users.reduce((a, u) => a + u.earned_usd, 0);
  const stats = statsQuery.data;

  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" style={{ color: "var(--mint)" }} />
        <h1 className="text-lg font-black">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={<Users className="h-4 w-4" />} label="Users" value={String(totalUsers)} />
        <Kpi icon={<Pickaxe className="h-4 w-4" />} label="Paid miners" value={`${withMiner}/${totalUsers}`} />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Total mined" value={formatUsd(totalMined)} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Active 24h" value={String(stats?.active_users_24h ?? "—")} />
        <Kpi icon={<Eye className="h-4 w-4" />} label="Ad views 24h" value={String(stats?.ad_views_24h ?? "—")} />
        <Kpi icon={<Zap className="h-4 w-4" />} label="Boosts actifs" value={String(stats?.active_boosts ?? "—")} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Revenu 24h" value={stats ? formatUsd(stats.revenue_24h_usd) : "—"} />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Revenu total" value={stats ? formatUsd(stats.revenue_estimate_usd) : "—"} />
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1 text-[11px] font-bold">
        {(["users", "ads", "boosts", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-1.5 transition-colors"
            style={{
              background: tab === t ? "var(--card)" : "transparent",
              color: tab === t ? "var(--mint)" : "var(--muted-foreground)",
            }}
          >
            {t === "users" ? "Users" : t === "ads" ? "Pubs" : t === "boosts" ? "Boosts" : "Réglages"}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by name, username, chat ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-mint"
            />
          </div>
          <section className="rounded-2xl border border-border bg-card p-2 shadow-card">
            {usersQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No users</div>
            ) : (
              <ul>
                {filtered.map((u) => {
                  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || `User ${u.tg_id}`;
                  return (
                    <li key={u.tg_id} className="flex items-center gap-2 border-b border-border px-2 py-2.5 last:border-b-0">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt="" className="h-9 w-9 rounded-full" />
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-bold">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-bold">{name}</span>
                          {u.has_miner && (
                            <span className="rounded-full px-1.5 py-[1px] text-[9px] font-bold"
                              style={{ background: "color-mix(in oklab, var(--mint) 18%, transparent)", color: "var(--mint)" }}>
                              MINER
                            </span>
                          )}
                        </div>
                        <div className="text-mono text-[10px] text-muted-foreground">
                          {u.username ? `@${u.username} · ` : ""}{u.tg_id}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          mined <b style={{ color: "var(--mint)" }}>{formatUsd(u.earned_usd)}</b>
                          {" · "}wallet {formatUsd(u.total_balance_usd)}
                          {" · "}{u.sessions} sess.
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => toggleMutation.mutate({ tgId: u.tg_id, hasMiner: !u.has_miner })}
                          disabled={toggleMutation.isPending}
                          className="rounded-lg border px-2 py-1 text-[10px] font-bold"
                          style={{
                            borderColor: u.has_miner ? "var(--border)" : "color-mix(in oklab, var(--mint) 40%, transparent)",
                            color: u.has_miner ? "var(--muted-foreground)" : "var(--mint)",
                            background: u.has_miner ? "var(--surface-2)" : "color-mix(in oklab, var(--mint) 10%, transparent)",
                          }}
                        >
                          {u.has_miner ? "Revoke" : "Miner"}
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const v = prompt("Ajouter combien d'$ ?", "10");
                              if (v) adjustMutation.mutate({ tgId: u.tg_id, deltaUsd: Number(v) });
                            }}
                            className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-[10px]"
                            title="Add USD"
                          ><Plus className="h-3 w-3" /></button>
                          <button
                            onClick={() => {
                              const v = prompt("Retirer combien d'$ ?", "10");
                              if (v) adjustMutation.mutate({ tgId: u.tg_id, deltaUsd: -Math.abs(Number(v)) });
                            }}
                            className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-[10px]"
                            title="Remove USD"
                          ><Minus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "ads" && <AdsPanel auth={auth} />}
      {tab === "boosts" && <BoostHistoryPanel auth={auth} />}
      {tab === "settings" && <SettingsPanel auth={auth} />}
    </div>
  );
}

function AdsPanel({ auth }: { auth: { initData: string; devTgId?: number } }) {
  const statsQ = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminGetStats({ data: auth }),
    refetchInterval: 15000,
  });
  const s = statsQ.data;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-black">Revenus publicitaires</div>
      <p className="text-[11px] text-muted-foreground">
        Estimation basée sur le CPM Adsgram. Les paiements réels arrivent sur ton wallet TON
        configuré dans ton compte Adsgram (puis convertibles en € via exchange).
      </p>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Mini label="Vues 24h" value={String(s?.ad_views_24h ?? "—")} />
        <Mini label="Vues 7j" value={String(s?.ad_views_7d ?? "—")} />
        <Mini label="Vues totales" value={String(s?.ad_views_total ?? "—")} />
        <Mini label="$ / vue" value={s ? `$${s.revenue_per_view_usd.toFixed(4)}` : "—"} />
        <Mini label="Revenu 24h" value={s ? formatUsd(s.revenue_24h_usd) : "—"} />
        <Mini label="Revenu total" value={s ? formatUsd(s.revenue_estimate_usd) : "—"} />
      </div>
    </section>
  );
}

function BoostHistoryPanel({ auth }: { auth: { initData: string; devTgId?: number } }) {
  const q = useQuery({
    queryKey: ["admin", "boost-history"],
    queryFn: () => adminGetBoostHistory({ data: { ...auth, limit: 100 } }),
    refetchInterval: 20000,
  });
  const data = q.data;
  const fmtDate = (s: string) => new Date(s).toLocaleString();
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="text-sm font-black">Historique des boosts</div>
      {!data ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Boosts activés ({data.boosts.length})</div>
          {data.boosts.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-muted-foreground">Aucun boost</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.boosts.map((b) => {
                const active = new Date(b.expires_at).getTime() > Date.now();
                return (
                  <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold">{b.name}</div>
                      <div className="text-mono text-[10px] text-muted-foreground">
                        {b.tg_id} · {b.source} · ×{b.multiplier}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{fmtDate(b.started_at)}</div>
                    </div>
                    <span
                      className="rounded-full px-1.5 py-[1px] text-[9px] font-bold"
                      style={{
                        background: active ? "color-mix(in oklab, var(--mint) 18%, transparent)" : "var(--surface-2)",
                        color: active ? "var(--mint)" : "var(--muted-foreground)",
                      }}
                    >
                      {active ? "ACTIF" : "EXPIRÉ"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Vues de pub ({data.views.length})</div>
          {data.views.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-muted-foreground">Aucune vue</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.views.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold">{v.name}</div>
                    <div className="text-mono text-[10px] text-muted-foreground">
                      {v.tg_id} · {v.block_id || "—"} · {v.status}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{fmtDate(v.ts)}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function SettingsPanel({ auth }: { auth: { initData: string; devTgId?: number } }) {
  const cfgQ = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminGetSettings({ data: auth }),
  });
  const [form, setForm] = useState<null | {
    enabled: boolean; multiplier: number; duration_min: number;
    cooldown_min: number; adsgram_block_id: string; revenue_per_view_usd: number;
  }>(null);

  useEffect(() => {
    if (cfgQ.data?.boost && !form) setForm(cfgQ.data.boost);
  }, [cfgQ.data, form]);

  const save = useMutation({
    mutationFn: () => adminUpdateBoostConfig({ data: { ...auth, ...form! } }),
    onSuccess: () => { toast.success("Réglages enregistrés"); cfgQ.refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!form) return <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-black">Boost publicitaire</div>
      <Field label="Activé">
        <button
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
          className="rounded-lg px-3 py-1 text-[11px] font-bold"
          style={{
            background: form.enabled ? "color-mix(in oklab, var(--mint) 20%, transparent)" : "var(--surface-2)",
            color: form.enabled ? "var(--mint)" : "var(--muted-foreground)",
          }}
        >{form.enabled ? "ON" : "OFF"}</button>
      </Field>
      <NumField label="Multiplicateur (×)" value={form.multiplier} step={0.5} min={1} max={10}
        onChange={(v) => setForm({ ...form, multiplier: v })} />
      <NumField label="Durée (minutes)" value={form.duration_min} step={5} min={1} max={1440}
        onChange={(v) => setForm({ ...form, duration_min: Math.round(v) })} />
      <NumField label="Cooldown (minutes)" value={form.cooldown_min} step={1} min={0} max={1440}
        onChange={(v) => setForm({ ...form, cooldown_min: Math.round(v) })} />
      <Field label="Adsgram Block ID">
        <input
          value={form.adsgram_block_id}
          onChange={(e) => setForm({ ...form, adsgram_block_id: e.target.value })}
          className="text-mono w-40 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right text-[11px] outline-none focus:border-mint"
        />
      </Field>
      <NumField label="$ par vue (CPM/1000)" value={form.revenue_per_view_usd} step={0.001} min={0} max={1}
        onChange={(v) => setForm({ ...form, revenue_per_view_usd: v })} />
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
        style={{ background: "var(--mint)", color: "var(--primary-foreground)" }}
      >
        <Save className="h-4 w-4" /> Enregistrer
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function NumField({
  label, value, step, min, max, onChange,
}: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-mono w-24 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right text-[11px] outline-none focus:border-mint"
      />
    </Field>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-black" style={{ color: "var(--mint)" }}>{value}</div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span style={{ color: "var(--mint)" }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-black" style={{ color: "var(--mint)" }}>
        {value}
      </div>
    </div>
  );
}
