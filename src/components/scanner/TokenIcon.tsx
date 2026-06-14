import { useState } from "react";
import { COINS, type CoinSym } from "@/lib/scanner/coins";

interface Props {
  sym: CoinSym;
  size?: number;
  className?: string;
}

export function TokenIcon({ sym, size = 36, className }: Props) {
  const c = COINS[sym];
  const [err, setErr] = useState(false);

  if (err) {
    return (
      <span
        className={`grid place-items-center rounded-full text-white font-black ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          background: c.color,
          fontSize: size * 0.45,
        }}
      >
        {c.icon}
      </span>
    );
  }

  return (
    <img
      src={c.logo}
      alt={`${c.name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className={`rounded-full bg-white/5 ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
