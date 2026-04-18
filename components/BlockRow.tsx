import Link from "next/link";
import { Block, shortHash } from "@/lib/api";

export default function BlockRow({ block }: { block: Block }) {
  const age = Math.floor((Date.now() - block.timestamp_ms) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.floor(age / 60)}m ago` : `${Math.floor(age / 3600)}h ago`;

  return (
    <div className="card card-hover flex items-center gap-4 px-4 py-3 text-xs">
      <span className="font-bold w-24 shrink-0 tabular-nums" style={{ color: "var(--mx-green)" }}>
        #{block.daa_score.toLocaleString('en-US')}
      </span>
      <Link href={`/blocks/${block.hash}`}
            className="flex-1 truncate hover:underline transition-colors"
            style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
        {shortHash(block.hash, 16)}
      </Link>
      <span className="w-16 text-right shrink-0" style={{ color: "var(--mx-dim)" }}>
        <span style={{ color: "var(--mx-mid)" }}>{block.tx_count}</span> txs
      </span>
      {/* OPoI badge — proof that the miner ran AI inference for this block */}
      {block.opoi_tag ? (
        <span
          title={`OPoI inference tag: ${block.opoi_tag}`}
          className="w-14 text-right shrink-0 font-mono"
          style={{ color: "var(--mx-green)", opacity: 0.9 }}
        >
          AI ✓
        </span>
      ) : (
        <span className="w-14 text-right shrink-0" style={{ color: "var(--mx-muted)" }}>—</span>
      )}
      <span className="w-16 text-right shrink-0"
            style={{ color: block.is_chain_block ? "var(--mx-mid)" : "var(--mx-muted)" }}>
        {block.is_chain_block ? "chain" : "DAG"}
      </span>
      <span className="w-20 text-right shrink-0" style={{ color: "var(--mx-dim)" }}>
        {ageStr}
      </span>
    </div>
  );
}
