import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Search, Users, Pickaxe, DollarSign, Activity } from "lucide-react";
import { useScanner } from "@/lib/scanner/state";
import { adminListUsers, adminToggleMiner } from "@/lib/scanner/api.functions";
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
  const [q, setQ] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminListUsers({ data: { initData, devTgId: devTgId ?? undefined } }),
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { tgId: number; hasMiner: boolean }) =>
      adminToggleMiner({ data: { initData, devTgId: devTgId ?? undefined, ...vars } }),
    onSuccess: () => {
      toast.success("Updated");
      usersQuery.refetch();
    },
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
  const totalSessions = users.reduce((a, u) => a + u.sessions, 0);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" style={{ color: "var(--mint)" }} />
        <h1 className="text-lg font-black">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={<Users className="h-4 w-4" />} label="Users" value={String(totalUsers)} />
        <Kpi icon={<Pickaxe className="h-4 w-4" />} label="Paid miners" value={`${withMiner} / ${totalUsers}`} />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Total mined" value={formatUsd(totalMined)} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Sessions" value={String(totalSessions)} />
      </div>

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
                <li
                  key={u.tg_id}
                  className="flex items-center gap-2 border-b border-border px-2 py-2.5 last:border-b-0"
                >
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
                        <span
                          className="rounded-full px-1.5 py-[1px] text-[9px] font-bold"
                          style={{
                            background: "color-mix(in oklab, var(--mint) 18%, transparent)",
                            color: "var(--mint)",
                          }}
                        >
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
                  <button
                    onClick={() => toggleMutation.mutate({ tgId: u.tg_id, hasMiner: !u.has_miner })}
                    disabled={toggleMutation.isPending}
                    className="shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-bold"
                    style={{
                      borderColor: u.has_miner ? "var(--border)" : "color-mix(in oklab, var(--mint) 40%, transparent)",
                      color: u.has_miner ? "var(--muted-foreground)" : "var(--mint)",
                      background: u.has_miner ? "var(--surface-2)" : "color-mix(in oklab, var(--mint) 10%, transparent)",
                    }}
                  >
                    {u.has_miner ? "Revoke" : "Grant miner"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
