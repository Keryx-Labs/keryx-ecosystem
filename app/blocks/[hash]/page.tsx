import { api, formatTimestamp, sompiToKrx, shortHash } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 30;

export default async function BlockPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let block = null;
  let txs = [];

  try {
    [block, txs] = await Promise.all([api.block(hash), api.blockTxs(hash)]);
  } catch { notFound(); }

  if (!block) notFound();

  const parents: string[] = block.parents ?? [];
  const children: string[] = block.children ?? [];

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Hash",         value: <span className="break-all" style={{ color: "var(--mx-green)", fontFamily: "monospace" }}>{block.hash}</span> },
    { label: "DAA Score",    value: block.daa_score.toLocaleString('en-US') },
    { label: "Blue Score",   value: block.blue_score.toLocaleString('en-US') },
    { label: "Timestamp",    value: formatTimestamp(block.timestamp_ms) },
    { label: "Difficulty",   value: block.difficulty.toExponential(4) },
    { label: "Bits",         value: `0x${block.bits.toString(16)}` },
    { label: "Transactions", value: block.tx_count },
    {
      label: "Status",
      value: (
        <span style={{ color: block.is_chain_block ? "var(--mx-mid)" : "var(--mx-muted)" }}>
          {block.is_chain_block ? "✓ Chain block" : "DAG block"}
        </span>
      ),
    },
    {
      label: "OPoI Tag",
      value: block.opoi_tag ? (
        <span style={{ color: "var(--mx-green)", fontFamily: "monospace" }}>
          ✓&nbsp;{block.opoi_tag}
          <span style={{ color: "var(--mx-dim)", fontSize: "0.75em", marginLeft: "0.5rem" }}>
            (inference proof v1)
          </span>
        </span>
      ) : (
        <span style={{ color: "var(--mx-muted)" }}>— (no OPoI tag)</span>
      ),
    },
    {
      label: `Parents (${parents.length})`,
      value: parents.length === 0
        ? <span style={{ color: "var(--mx-dim)" }}>—</span>
        : (
          <div className="flex flex-col gap-1">
            {parents.map((h) => (
              <Link key={h} href={`/blocks/${h}`}
                    className="hover:underline truncate"
                    style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                {h}
              </Link>
            ))}
          </div>
        ),
    },
    {
      label: `Children (${children.length})`,
      value: children.length === 0
        ? <span style={{ color: "var(--mx-dim)" }}>—</span>
        : (
          <div className="flex flex-col gap-1">
            {children.map((h) => (
              <Link key={h} href={`/blocks/${h}`}
                    className="hover:underline truncate"
                    style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                {h}
              </Link>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[10px]" style={{ color: "var(--mx-dim)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Home</Link>
        {" / "}
        <Link href="/blocks" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Blocks</Link>
        {" / "}
        <span style={{ color: "var(--mx-mid)" }}>{shortHash(block.hash)}</span>
      </div>

      <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
        Block #{block.daa_score.toLocaleString('en-US')}
      </h1>

      {/* Detail table */}
      <div className="card" style={{ borderColor: "var(--mx-border)" }}>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex gap-4 px-4 py-3 text-xs border-b last:border-0"
               style={{ borderColor: "var(--mx-border)" }}>
            <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>{label}</span>
            <span style={{ color: "var(--mx-mid)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Transactions */}
      {txs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
            Transactions ({txs.length})
          </h2>
          <div className="flex flex-col gap-1">
            {txs.map((tx) => (
              <div key={tx.tx_id} className="card card-hover px-4 py-3 text-xs flex items-center gap-4">
                {tx.is_coinbase && (
                  <span className="shrink-0 px-1.5 py-px text-[9px] font-bold tracking-widest"
                        style={{ color: "var(--mx-dim)", border: "1px solid var(--mx-muted)" }}>
                    COINBASE
                  </span>
                )}
                <Link href={`/tx/${tx.tx_id}`}
                      className="flex-1 truncate hover:underline"
                      style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                  {shortHash(tx.tx_id, 20)}
                </Link>
                <span className="shrink-0 tabular-nums" style={{ color: "var(--mx-mid)" }}>
                  {sompiToKrx(tx.total_out_sompi)} KRX
                </span>
                {tx.payload_hex && tx.payload_hex !== "" && (
                  <span className="shrink-0 px-1.5 py-px text-[9px] font-bold tracking-widest"
                        style={{ color: "var(--mx-mid)", border: "1px solid var(--mx-dim)" }}>
                    AI
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
