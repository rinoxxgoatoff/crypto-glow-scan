import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { DailyBonus } from "@/components/scanner/DailyBonus";
import { ScannerTerminal } from "@/components/scanner/ScannerTerminal";
import { TokenList } from "@/components/scanner/TokenList";
import { VerifyDialog, WithdrawDialog } from "@/components/scanner/WithdrawDialogs";
import { useMining } from "@/lib/scanner/mining";
import { useScanner } from "@/lib/scanner/state";
import { COINS, type CoinSym } from "@/lib/scanner/coins";
import { formatAmount, formatUsd } from "@/lib/scanner/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scanner Crypto — Mine 12 cryptocurrencies" },
      { name: "description", content: "Start cloud mining in one tap. Daily bonus, live terminal and 12-token balance." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { mining, lines, hashRate, base, toggle } = useMining();
  const hasMiner = useScanner((s) => s.me?.has_miner ?? false);
  const bal = useScanner((s) => s.bal);
  const navigate = Route.useNavigate();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [wdOpen, setWdOpen] = useState(false);
  const [wdSym, setWdSym] = useState<CoinSym | null>(null);

  const onWithdraw = (sym: CoinSym) => {
    const amount = bal[sym] || 0;
    const usd = amount * COINS[sym].price;
    if (usd < 10) {
      // sonner toast handled at component level; keep silent or could use toast.error
      import("sonner").then(({ toast }) => toast.error(`Minimum $10 · you have ${formatUsd(usd)}`));
      return;
    }
    if (!hasMiner) {
      setVerifyOpen(true);
      return;
    }
    setWdSym(sym);
    setWdOpen(true);
  };

  void base;

  const wdAmount = wdSym ? formatAmount(bal[wdSym] || 0) : "";
  const wdUsd = wdSym ? formatUsd((bal[wdSym] || 0) * COINS[wdSym].price) : "";

  return (
    <div className="flex flex-col gap-3 pb-3">
      <DailyBonus />

      <ScannerTerminal mining={mining} lines={lines} hashRate={hashRate} base={base} onToggle={toggle} />
      <TokenList withWithdraw onWithdraw={onWithdraw} />

      <VerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        onBuy={() => {
          setVerifyOpen(false);
          navigate({ to: "/miner" });
        }}
      />
      <WithdrawDialog open={wdOpen} onOpenChange={setWdOpen} sym={wdSym} amount={wdAmount} usd={wdUsd} />
    </div>
  );
}
