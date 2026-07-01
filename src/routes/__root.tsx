import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { TopBar } from "@/components/scanner/TopBar";
import { BottomNav } from "@/components/scanner/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { useScanner, useTelegramBootstrap } from "@/lib/scanner/state";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "Scanner Crypto — Cloud Mining Mini App" },
      { name: "description", content: "Mine, swap and track 12 cryptocurrencies from one slick mini-app interface." },
      { name: "theme-color", content: "#0f1a26" },
      { property: "og:title", content: "Scanner Crypto — Cloud Mining Mini App" },
      { property: "og:description", content: "Mine, swap and track 12 cryptocurrencies from one slick mini-app interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Scanner Crypto — Cloud Mining Mini App" },
      { name: "twitter:description", content: "Mine, swap and track 12 cryptocurrencies from one slick mini-app interface." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
    scripts: [
      { src: "https://telegram.org/js/telegram-web-app.js", async: true },
      { src: "https://sad.adsgram.ai/js/sad.min.js", async: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster position="bottom-center" theme="dark" />
    </QueryClientProvider>
  );
}

function AppShell() {
  useTelegramBootstrap();
  const ready = useScanner((s) => s.ready);
  const authError = useScanner((s) => s.authError);
  const initData = useScanner((s) => s.initData);
  const devTgId = useScanner((s) => s.devTgId);

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        {!initData && !devTgId ? (
          <DevLoginGate />
        ) : authError ? (
          <ErrorGate message={authError} />
        ) : (
          <LoadingGate />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-background">
      <TopBar />
      <main className="flex-1 overflow-y-auto px-3 pb-3 pt-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function LoadingGate() {
  return (
    <>
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-mint border-t-transparent" />
      <div className="text-sm text-muted-foreground">Connecting to Telegram…</div>
    </>
  );
}

function ErrorGate({ message }: { message: string }) {
  const bootstrap = useScanner((s) => s.bootstrap);
  return (
    <>
      <div className="text-4xl">🔒</div>
      <h2 className="text-lg font-bold">Telegram authentication failed</h2>
      <p className="text-xs text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">
        Open this app from your Telegram bot to continue.
      </p>
      <button
        onClick={() => bootstrap()}
        className="rounded-xl bg-mint px-4 py-2 text-sm font-bold text-primary-foreground"
        style={{ background: "var(--mint)", color: "var(--primary-foreground)" }}
      >
        Retry
      </button>
    </>
  );
}

function DevLoginGate() {
  const setDevTgId = useScanner((s) => s.setDevTgId);
  const [val, setVal] = useState("");
  return (
    <>
      <div className="text-4xl">📲</div>
      <h2 className="text-lg font-bold">Ouvre cette app depuis Telegram</h2>
      <p className="text-xs text-muted-foreground">
        Bebol est une mini-app Telegram. Chaque compte Telegram a sa propre balance —
        ton compte est détecté automatiquement quand tu ouvres l'app depuis le bot
        (aucune saisie nécessaire).
      </p>
      {import.meta.env.DEV && (
        <div className="mt-3 w-full max-w-xs rounded-xl border border-border bg-surface-2 p-3 text-left">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Aperçu navigateur (dev only)
          </div>
          <input
            inputMode="numeric"
            placeholder="Telegram chat ID"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))}
            className="text-mono mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
          />
          <button
            disabled={!val}
            onClick={() => setDevTgId(Number(val))}
            className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40"
            style={{ background: "var(--mint)", color: "var(--primary-foreground)" }}
          >
            Continuer
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            En production, ce panneau n'apparaît jamais — Telegram fournit l'identité.
          </p>
        </div>
      )}
    </>
  );
}
