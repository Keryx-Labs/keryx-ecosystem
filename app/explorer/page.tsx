import { api, Block, NetworkInfo, Transaction } from "@/lib/api";
import InfoPanel from "@/components/InfoPanel";
import LiveBlocks from "@/components/LiveBlocks";
import LiveTransactions from "@/components/LiveTransactions";
import Link from "next/link";

export const revalidate = 0;

export default async function ExplorerPage() {
  let info: NetworkInfo | null = null;
  let blocks: Block[] = [];
  let txs: Transaction[] = [];
  let error: string | null = null;

  try {
    [info, blocks, txs] = await Promise.all([
      api.info(),
      api.blocks(20),
      api.transactions(20),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="text-center py-5">
        <h1 className="text-4xl font-black tracking-[0.25em] glow mb-1"
            style={{ color: "var(--mx-bright)" }}>
          KERYX
        </h1>
        <p className="text-[10px] tracking-[0.3em] uppercase"
           style={{ color: "var(--mx-dim)" }}>
          Decentralized AI Inference · BlockDAG · KeryxHash PoW
        </p>
      </div>

      {/* Stats panels */}
      {info ? (
        <InfoPanel info={info} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-40" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-3 text-xs" style={{ borderColor: "var(--mx-error)", color: "var(--mx-error)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Two-column live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Blocks */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
              <span style={{ color: "var(--mx-mid)" }}>▸</span> Latest Blocks
            </h2>
            <Link href="/blocks" className="text-[10px] hover:underline" style={{ color: "var(--mx-mid)" }}>
              View all →
            </Link>
          </div>

          <div className="flex items-center gap-3 px-3 text-[9px] uppercase tracking-widest pb-1 border-b"
               style={{ color: "var(--mx-muted)", borderColor: "var(--mx-border)" }}>
            <span className="w-24 shrink-0">DAA Score</span>
            <span className="flex-1">Hash</span>
            <span className="w-14 text-right shrink-0">Txs</span>
            <span className="w-10 text-right shrink-0">Type</span>
            <span className="w-10 text-right shrink-0">Age</span>
          </div>

          <div className="overflow-hidden" style={{ maxHeight: "610px" }}>
            {blocks.length > 0 ? (
              <LiveBlocks initial={blocks} />
            ) : !error ? (
              <div className="card p-6 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
                Waiting for blocks…
              </div>
            ) : null}
          </div>
        </div>

        {/* Transactions */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
              <span style={{ color: "var(--mx-mid)" }}>▸</span> Latest Transactions
            </h2>
            <span className="text-[9px]" style={{ color: "var(--mx-muted)" }}>live</span>
          </div>

          <div className="flex items-center gap-4 px-3 text-[9px] uppercase tracking-widest pb-1 border-b"
               style={{ color: "var(--mx-muted)", borderColor: "var(--mx-border)" }}>
            <span className="flex-1">TX ID</span>
            <span>Block</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="overflow-hidden" style={{ maxHeight: "610px" }}>
            {txs.length > 0 ? (
              <LiveTransactions initial={txs} />
            ) : !error ? (
              <div className="card p-6 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
                Waiting for transactions…
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
