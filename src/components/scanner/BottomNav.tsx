import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Pickaxe, ArrowLeftRight, User, ShieldCheck } from "lucide-react";
import { useScanner } from "@/lib/scanner/state";

const baseItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/miner", label: "Miner", Icon: Pickaxe },
  { to: "/swap", label: "Swap", Icon: ArrowLeftRight },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useScanner((s) => s.me?.is_admin ?? false);
  const items = isAdmin
    ? [...baseItems, { to: "/admin", label: "Admin", Icon: ShieldCheck } as const]
    : baseItems;
  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-border bg-surface-1/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-md">
      {items.map(({ to, label, Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className="group flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold tracking-wide"
            style={{ color: active ? "var(--mint)" : "var(--muted-foreground)" }}
          >
            <span
              className="grid h-8 w-12 place-items-center rounded-xl transition-all"
              style={{
                background: active ? "var(--mint-soft)" : "transparent",
                transform: active ? "scale(1.02)" : "scale(1)",
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
