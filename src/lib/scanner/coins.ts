export type CoinSym =
  | "BTC" | "ETH" | "BNB" | "SOL" | "LTC" | "XRP"
  | "TON" | "TRX" | "USDT" | "USDC" | "DOGE" | "SUI";

export interface CoinInfo {
  sym: CoinSym;
  name: string;
  icon: string;
  price: number; // USD
  color: string; // bg color fallback
  logo: string;  // CDN image URL
}

const cg = (id: string, file: string) =>
  `https://assets.coingecko.com/coins/images/${id}/small/${file}`;

export const COINS: Record<CoinSym, CoinInfo> = {
  BTC:  { sym: "BTC",  name: "Bitcoin",  icon: "₿", price: 63800, color: "#f7931a", logo: cg("1",     "bitcoin.png") },
  ETH:  { sym: "ETH",  name: "Ethereum", icon: "E", price: 2160,  color: "#627eea", logo: cg("279",   "ethereum.png") },
  BNB:  { sym: "BNB",  name: "BNB",      icon: "B", price: 605,   color: "#f0b90b", logo: cg("825",   "bnb-icon2_2x.png") },
  SOL:  { sym: "SOL",  name: "Solana",   icon: "S", price: 142,   color: "linear-gradient(135deg,#9945ff,#14f195)", logo: cg("4128",  "solana.png") },
  LTC:  { sym: "LTC",  name: "Litecoin", icon: "L", price: 84,    color: "#9b9b9b", logo: cg("2",     "litecoin.png") },
  XRP:  { sym: "XRP",  name: "XRP",      icon: "X", price: 0.52,  color: "#346aa9", logo: cg("44",    "xrp-symbol-white-128.png") },
  TON:  { sym: "TON",  name: "Toncoin",  icon: "T", price: 5.85,  color: "#0098ea", logo: cg("17980", "ton_symbol.png") },
  TRX:  { sym: "TRX",  name: "TRON",     icon: "R", price: 0.125, color: "#ef0027", logo: cg("1094",  "tron-logo.png") },
  USDT: { sym: "USDT", name: "Tether",   icon: "₮", price: 1.0,   color: "#26a17b", logo: cg("325",   "Tether.png") },
  USDC: { sym: "USDC", name: "USD Coin", icon: "C", price: 1.0,   color: "#2775ca", logo: cg("6319",  "usdc.png") },
  DOGE: { sym: "DOGE", name: "Dogecoin", icon: "D", price: 0.163, color: "#c3a634", logo: cg("5",     "dogecoin.png") },
  SUI:  { sym: "SUI",  name: "Sui",      icon: "U", price: 3.22,  color: "#6fbcf0", logo: cg("26375", "sui-ocean-square.png") },
};

export const COIN_LIST = Object.keys(COINS) as CoinSym[];
export const MINEABLE: CoinSym[] = ["BTC","ETH","SOL","LTC","XRP","TON","TRX","DOGE","BNB","SUI"];

export const PAY_ADDRESSES = {
  BTC: "bc1qp669rj44curqzngw83gqmuwms5q0stzga7x9z8",
  ETH: "0xd1774E1AA3736E4907BaDc103481ff6d70851D67",
  SOL: "66Gt1WgqrApF9QNi2jAjY81iFebnHDCYjpETR5HZPFCi",
} as const;

export const DAILY_TON = [0.1, 0.2, 0.3, 0.5, 0.75, 1, 2];
