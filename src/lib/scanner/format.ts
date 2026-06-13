export function formatAmount(v: number): string {
  v = Number(v) || 0;
  if (v === 0) return "0.00000000";
  if (v < 0.00001) return v.toFixed(10).replace(/0+$/, "");
  if (v < 0.001) return v.toFixed(8);
  if (v < 0.1) return v.toFixed(6);
  if (v < 1) return v.toFixed(5);
  if (v < 10000) return v.toFixed(4);
  return v.toFixed(2);
}

export function formatUsd(v: number): string {
  v = Number(v) || 0;
  if (v === 0) return "$0.00";
  if (v < 0.01) return "$" + v.toFixed(4);
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const shortAddr = (a: string, l = 8, r = 6) =>
  a.length > l + r + 3 ? `${a.slice(0, l)}…${a.slice(-r)}` : a;
