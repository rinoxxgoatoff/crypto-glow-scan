import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MinerShop, ContactSheet } from "@/components/scanner/MinerShop";
import { MinerActive } from "@/components/scanner/MinerActive";
import { useScanner } from "@/lib/scanner/state";

export const Route = createFileRoute("/miner")({
  head: () => ({
    meta: [
      { title: "Mining Rig — Scanner Crypto" },
      { name: "description", content: "Buy the Basic Mining Rig to unlock withdrawals and boost speed to 75 MH/s." },
    ],
  }),
  component: MinerPage,
});

function MinerPage() {
  const hasMiner = useScanner((s) => s.me?.has_miner ?? false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="pb-3">
      {hasMiner ? <MinerActive /> : <MinerShop onIvePaid={() => setContactOpen(true)} />}
      <ContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
