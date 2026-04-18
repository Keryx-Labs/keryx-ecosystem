"use client";

import { NetworkInfo, formatHashrate, formatSupply } from "@/lib/api";

interface Props {
  info: NetworkInfo;
}

function Row({ label, value, bright }: { label: string; value: React.ReactNode; bright?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[5px] border-b last:border-0"
         style={{ borderColor: "var(--mx-muted)" }}>
      <span className="text-[10px] uppercase tracking-widest shrink-0"
            style={{ color: "var(--mx-dim)" }}>
        {label}
      </span>
      <span className={`text-xs font-bold text-right tabular-nums ${bright ? "glow-bright" : ""}`}
            style={{ color: bright ? "var(--mx-bright)" : "var(--mx-mid)" }}>
        {value}
      </span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 flex flex-col gap-0">
      <div className="text-[9px] font-bold uppercase tracking-[0.3em] pb-2 mb-1 border-b"
           style={{ color: "var(--mx-dim)", borderColor: "var(--mx-muted)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function InfoPanel({ info }: Props) {
  const minedPct      = (info.mined_pct ?? 0).toFixed(2);
  const hashrate      = formatHashrate(info.hashrate_hps ?? 0);
  const totalSupply   = formatSupply(info.total_supply_krx ?? 0);
  const maxSupply     = formatSupply(info.max_supply_krx ?? 28_700_000_000);
  const blockReward   = (info.block_reward_krx ?? 0).toFixed(2);
  const daaScore      = (info.last_daa_score ?? 0).toLocaleString('en-US');
  const totalBlocks   = (info.total_blocks ?? 0).toLocaleString('en-US');
  const totalTxs      = (info.total_txs ?? 0).toLocaleString('en-US');
  const network       = (info.network ?? "keryx-mainnet").replace("keryx-", "").toUpperCase();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

      {/* ── Coin Supply ── */}
      <Panel title="Coin Supply">
        <Row label="Total"         value={`${totalSupply} KRX`} bright />
        <Row label="Max (approx)"  value={`${maxSupply} KRX`} />
        <Row label="Mined"         value={`${minedPct} %`} />
        <Row label="Block Reward"  value={`${blockReward} KRX`} bright />
      </Panel>

      {/* ── Network Info ── */}
      <Panel title="Network Info">
        <Row label="Network"    value={`KERYX ${network}`} />
        <Row label="DAA Score"  value={daaScore} bright />
        <Row label="Hashrate"   value={hashrate} bright />
        <Row label="Blocks"     value={totalBlocks} />
        <Row label="Txs"        value={totalTxs} />
        <Row label="Algorithm"  value="KeryxHash" />
      </Panel>

      {/* ── Market Data ── */}
      <Panel title="Market Data">
        <Row label="Symbol"   value="KRX" bright />
        <Row label="Price"    value="— listing soon" />
        <Row label="Volume"   value="—" />
        <Row label="MCAP"     value="—" />
      </Panel>

    </div>
  );
}
