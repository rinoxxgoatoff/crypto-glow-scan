export type CoinSym =
  | "BTC" | "ETH" | "BNB" | "SOL" | "LTC" | "XRP"
  | "TON" | "TRX" | "USDT" | "USDC" | "DOGE" | "SUI";

export interface CoinInfo {
  sym: CoinSym;
  name: string;
  icon: string;
  price: number; // USD
  color: string; // bg color for token chip
}

export const COINS: Record<CoinSym, CoinInfo> = {
  BTC:  { sym: "BTC",  name: "Bitcoin",  icon: "₿", price: 63800, color: "#f7931a" },
  ETH:  { sym: "ETH",  name: "Ethereum", icon: "E", price: 2160,  color: "#627eea" },
  BNB:  { sym: "BNB",  name: "BNB",      icon: "B", price: 605,   color: "#f0b90b" },
  SOL:  { sym: "SOL",  name: "Solana",   icon: "S", price: 142,   color: "linear-gradient(135deg,#9945ff,#14f195)" },
  LTC:  { sym: "LTC",  name: "Litecoin", icon: "L", price: 84,    color: "#9b9b9b" },
  XRP:  { sym: "XRP",  name: "XRP",      icon: "X", price: 0.52,  color: "#346aa9" },
  TON:  { sym: "TON",  name: "Toncoin",  icon: "T", price: 5.85,  color: "#0098ea" },
  TRX:  { sym: "TRX",  name: "TRON",     icon: "R", price: 0.125, color: "#ef0027" },
  USDT: { sym: "USDT", name: "Tether",   icon: "₮", price: 1.0,   color: "#26a17b" },
  USDC: { sym: "USDC", name: "USD Coin", icon: "C", price: 1.0,   color: "#2775ca" },
  DOGE: { sym: "DOGE", name: "Dogecoin", icon: "D", price: 0.163, color: "#c3a634" },
  SUI:  { sym: "SUI",  name: "Sui",      icon: "U", price: 3.22,  color: "#6fbcf0" },
};

export const COIN_LIST = Object.keys(COINS) as CoinSym[];
export const MINEABLE: CoinSym[] = ["BTC","ETH","SOL","LTC","XRP","TON","TRX","DOGE","BNB","SUI"];

export const PAY_ADDRESSES = {
  BTC: "bc1qp669rj44curqzngw83gqmuwms5q0stzga7x9z8",
  ETH: "0xd1774E1AA3736E4907BaDc103481ff6d70851D67",
  SOL: "66Gt1WgqrApF9QNi2jAjY81iFebnHDCYjpETR5HZPFCi",
} as const;
