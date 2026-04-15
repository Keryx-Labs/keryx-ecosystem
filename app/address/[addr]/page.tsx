import { api, sompiToKrx, shortHash } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 10;

export default async function AddressPage({ params }: { params: { addr: string } }) {
  let info = null;
  try { info = await api.address(params.addr); } catch { notFound(); }
  if (!info) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[10px]" style={{ color: "var(--mx-dim)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Home</Link>
        {" / "}
        <span style={{ color: "var(--mx-mid)" }}>Address</span>
      </div>

      <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
        Address
      </h1>

      <div className="card">
        <div className="flex gap-4 px-4 py-3 text-xs border-b" style={{ borderColor: "var(--mx-border)" }}>
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Address</span>
          <span className="break-all" style={{ color: "var(--mx-green)", fontFamily: "monospace" }}>{info.address}</span>
        </div>
        <div className="flex gap-4 px-4 py-3 text-xs border-b" style={{ borderColor: "var(--mx-border)" }}>
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Total received</span>
          <span className="font-bold tabular-nums" style={{ color: "var(--mx-mid)" }}>
            {sompiToKrx(info.total_received_sompi)} KRX
          </span>
        </div>
        <div className="flex gap-4 px-4 py-3 text-xs">
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Transactions</span>
          <span style={{ color: "var(--mx-mid)" }}>{info.transactions.length}</span>
        </div>
      </div>

      {info.transactions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
            Transaction History
          </h2>

          <div className="text-[9px] uppercase tracking-widest flex items-center gap-4 px-4 pb-2 border-b"
               style={{ color: "var(--mx-muted)", borderColor: "var(--mx-border)" }}>
            <span className="w-24 shrink-0">DAA Score</span>
            <span className="flex-1">TX ID</span>
            <span className="w-32 text-right shrink-0">Amount (KRX)</span>
          </div>

          <div className="flex flex-col gap-1">
            {info.transactions.map((tx, i) => (
              <div key={i} className="card card-hover flex items-center gap-4 px-4 py-3 text-xs">
                <span className="w-24 shrink-0 tabular-nums" style={{ color: "var(--mx-green)" }}>
                  #{tx.daa_score.toLocaleString()}
                </span>
                <Link href={`/tx/${tx.tx_id}`}
                      className="flex-1 truncate hover:underline"
                      style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}>
                  {shortHash(tx.tx_id, 20)}
                </Link>
                <span className="w-32 text-right shrink-0 tabular-nums" style={{ color: "var(--mx-mid)" }}>
                  +{sompiToKrx(tx.amount_sompi)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {info.transactions.length === 0 && (
        <div className="card p-8 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
          No transactions found for this address.
        </div>
      )}
    </div>
  );
}
