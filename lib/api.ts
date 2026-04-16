const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

export interface NetworkInfo {
  network: string;
  last_daa_score: number;
  total_blocks: number;
  total_txs: number;
  hashrate_hps: number;
  total_supply_krx: number;
  block_reward_krx: number;
  max_supply_krx: number;
  mined_pct: number;
}

export interface Block {
  hash: string;
  timestamp_ms: number;
  daa_score: number;
  blue_score: number;
  bits: number;
  difficulty: number;
  is_chain_block: boolean;
  tx_count: number;
  indexed_at: number;
  parents?: string[];
  children?: string[];
}

export interface TxOutput {
  output_index: number;
  address: string;
  amount_sompi: number;
}

export interface TxInput {
  input_index: number;
  prev_tx_id: string;
  prev_output_index: number;
  address: string;
  amount_sompi: number;
}

export interface Transaction {
  tx_id: string;
  block_hash: string;
  payload_hex: string;
  inputs_count: number;
  outputs_count: number;
  total_out_sompi: number;
  is_coinbase: boolean;
  // enriched fields (transaction detail endpoint only)
  block?: { daa_score: number; timestamp_ms: number; is_chain_block: boolean };
  confirmations?: number;
  outputs?: TxOutput[];
  inputs?: TxInput[];
}

export interface AddressInfo {
  address: string;
  total_received_sompi: number;
  total_tx_count: number;
  transactions: AddressTx[];
}

export interface AddressTx {
  address: string;
  tx_id: string;
  amount_sompi: number;
  block_hash: string;
  daa_score: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error ?? ""; } catch {}
    throw new Error(`API ${res.status}${detail ? ` — ${detail}` : ""} (${path})`);
  }
  return res.json();
}

export interface UtxoEntry {
  address: string;
  transaction_id: string;
  index: number;
  amount_sompi: number;
  script_version: number;
  script_public_key: string;
  block_daa_score: number;
  is_coinbase: boolean;
}

export interface AddressBalance {
  address: string;
  balance_sompi: number;
}

export interface GraphBlock {
  hash: string;
  daa_score: number;
  blue_score: number;
  is_chain_block: boolean;
  tx_count: number;
  timestamp_ms: number;
  parents: string[];
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error ?? ""; } catch {}
    throw new Error(`API ${res.status}${detail ? ` — ${detail}` : ""} (${path})`);
  }
  return res.json();
}

export const api = {
  info: () => get<NetworkInfo>("/api/v1/info"),
  blocks: (limit = 20, offset = 0) =>
    get<Block[]>(`/api/v1/blocks?limit=${limit}&offset=${offset}`),
  block: (hash: string) => get<Block>(`/api/v1/blocks/${hash}`),
  blockTxs: (hash: string) => get<Transaction[]>(`/api/v1/blocks/${hash}/txs`),
  transactions: (limit = 20, offset = 0) =>
    get<Transaction[]>(`/api/v1/transactions?limit=${limit}&offset=${offset}`),
  transaction: (id: string) => get<Transaction>(`/api/v1/transactions/${id}`),
  address: (addr: string, limit = 0, offset = 0) =>
    get<AddressInfo>(`/api/v1/addresses/${addr}?limit=${limit}&offset=${offset}`),
  // DAG graph inspector
  graph: (limit = 80) => get<GraphBlock[]>(`/api/v1/graph?limit=${limit}`),
  // Wallet endpoints
  balance: (addr: string) => get<AddressBalance>(`/api/v1/addresses/${addr}/balance`),
  utxos: (addr: string) => get<UtxoEntry[]>(`/api/v1/addresses/${addr}/utxos`),
  broadcast: (tx: unknown) => post<{ transaction_id: string }>("/api/v1/broadcast", tx),
};

// Helpers
export const sompiToKrx = (sompi: number): string => {
  return (sompi / 1e8).toFixed(8).replace(/\.?0+$/, "") || "0";
};

export const formatHashrate = (hps: number): string => {
  if (hps <= 0) return "0 H/s";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let i = 0;
  let v = hps;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(2)} ${units[i]}`;
};

export const formatSupply = (krx: number): string => {
  if (krx >= 1e9) return `${(krx / 1e9).toFixed(3)} B`;
  if (krx >= 1e6) return `${(krx / 1e6).toFixed(3)} M`;
  return krx.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const shortHash = (hash: string, len = 12): string => {
  if (!hash || hash.length <= len * 2) return hash;
  return `${hash.slice(0, len)}…${hash.slice(-6)}`;
};

export const formatTimestamp = (ms: number): string => {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
};
