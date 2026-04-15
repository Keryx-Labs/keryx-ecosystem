import { api, sompiToKrx, shortHash, formatTimestamp, type Transaction, type TxOutput, type TxInput } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function TxPage({ params }: { params: { id: string } }) {
  let tx: Transaction | null = null;

  try {
    tx = await api.transaction(params.id);
  } catch { notFound(); }

  if (!tx) notFound();

  const block = tx.block ?? null;
  const outputs: TxOutput[] = tx.outputs ?? [];
  const inputs: TxInput[]   = tx.inputs  ?? [];
  const hasPayload = tx.payload_hex && tx.payload_hex !== "";
  const isAccepted = block?.is_chain_block ?? false;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[10px]" style={{ color: "var(--mx-dim)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Home</Link>
        {" / "}
        <span style={{ color: "var(--mx-mid)" }}>Transaction</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
          Transaction
        </h1>
        {tx.is_coinbase && (
          <span className="text-[9px] font-bold tracking-widest px-2 py-0.5"
                style={{ color: "var(--mx-dim)", border: "1px solid var(--mx-muted)" }}>
            COINBASE
          </span>
        )}
        {hasPayload && (
          <span className="text-[9px] font-bold tracking-widest px-2 py-0.5"
                style={{ color: "var(--mx-mid)", border: "1px solid var(--mx-dim)" }}>
            AI INFERENCE
          </span>
        )}
        <span className="text-[9px] font-bold tracking-widest px-2 py-0.5"
              style={{
                color: isAccepted ? "var(--mx-green)" : "var(--mx-muted)",
                border: `1px solid ${isAccepted ? "var(--mx-green)" : "var(--mx-muted)"}`,
              }}>
          {isAccepted ? "ACCEPTED" : "NOT ACCEPTED"}
        </span>
      </div>

      {/* Metadata table */}
      <div className="card">
        {[
          { label: "TX ID",          value: <span className="break-all" style={{ color: "var(--mx-green)", fontFamily: "monospace" }}>{tx.tx_id}</span> },
          { label: "Block",          value: <Link href={`/blocks/${tx.block_hash}`} className="hover:underline break-all" style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>{shortHash(tx.block_hash, 20)}</Link> },
          { label: "DAA Score",      value: block?.daa_score.toLocaleString() ?? "—" },
          { label: "Timestamp",      value: block ? formatTimestamp(block.timestamp_ms) : "—" },
          { label: "Confirmations",  value: (tx.confirmations ?? 0) > 0 ? (tx.confirmations ?? 0).toLocaleString() : "—" },
          { label: "Total Output",   value: <span style={{ color: "var(--mx-mid)" }}>{sompiToKrx(tx.total_out_sompi)} KRX</span> },
        ].map(({ label, value }) => (
          <div key={label} className="flex gap-4 px-4 py-3 text-xs border-b last:border-0"
               style={{ borderColor: "var(--mx-border)" }}>
            <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>{label}</span>
            <span style={{ color: "var(--mx-mid)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* FROM / TO panel */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
          Inputs / Outputs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* FROM */}
          <div className="card flex flex-col gap-0">
            <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] border-b"
                 style={{ color: "var(--mx-dim)", borderColor: "var(--mx-border)" }}>
              From
            </div>
            {tx.is_coinbase ? (
              <div className="px-4 py-3 text-xs" style={{ color: "var(--mx-muted)" }}>
                COINBASE — New coins
              </div>
            ) : inputs.length === 0 ? (
              <div className="px-4 py-3 text-xs" style={{ color: "var(--mx-dim)" }}>No input data</div>
            ) : (
              inputs.map((inp) => (
                <div key={inp.input_index}
                     className="flex items-center justify-between gap-3 px-4 py-2 text-xs border-b last:border-0"
                     style={{ borderColor: "var(--mx-border)" }}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {inp.address ? (
                      <Link href={`/address/${inp.address}`}
                            className="truncate hover:underline"
                            style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                        {inp.address}
                      </Link>
                    ) : (
                      <span className="text-[10px]" style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                        {shortHash(inp.prev_tx_id, 12)}:{inp.prev_output_index}
                      </span>
                    )}
                  </div>
                  {inp.amount_sompi > 0 && (
                    <span className="shrink-0 tabular-nums" style={{ color: "var(--mx-mid)" }}>
                      -{sompiToKrx(inp.amount_sompi)} KRX
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* TO */}
          <div className="card flex flex-col gap-0">
            <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] border-b"
                 style={{ color: "var(--mx-dim)", borderColor: "var(--mx-border)" }}>
              To
            </div>
            {outputs.length === 0 ? (
              <div className="px-4 py-3 text-xs" style={{ color: "var(--mx-dim)" }}>No output data</div>
            ) : (
              outputs.map((out) => (
                <div key={out.output_index}
                     className="flex items-center justify-between gap-3 px-4 py-2 text-xs border-b last:border-0"
                     style={{ borderColor: "var(--mx-border)" }}>
                  <Link href={`/address/${out.address}`}
                        className="truncate hover:underline"
                        style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                    {out.address || "—"}
                  </Link>
                  <span className="shrink-0 tabular-nums" style={{ color: "var(--mx-green)" }}>
                    +{sompiToKrx(out.amount_sompi)} KRX
                  </span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* AI Payload */}
      {hasPayload && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
            Payload — AI Inference Data
          </h2>
          <pre className="text-[10px] p-3 overflow-x-auto break-all whitespace-pre-wrap rounded-sm"
               style={{ color: "var(--mx-mid)", background: "#020802", border: "1px solid var(--mx-border)", fontFamily: "monospace" }}>
            {tx.payload_hex}
          </pre>
        </div>
      )}
    </div>
  );
}
