import { ChevronDown, X } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs text-foreground"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" /> Close
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-extrabold tracking-tight">
          Scanner Crypto
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1d6ef5] text-[9px] text-white">
            ✓
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">mini app</div>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}
