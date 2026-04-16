"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, sompiToKrx, shortHash, type AddressInfo } from "@/lib/api";

const PAGE_SIZE = 10;

// ── Pagination bar ────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build the window of page numbers to show (max 7 slots)
  const buildWindow = (): (number | "…")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "…")[] = [];
    const left = Math.max(2, page - 2);
    const right = Math.min(totalPages - 1, page + 2);

    pages.push(1);
    if (left > 2) pages.push("…");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  const btnBase: React.CSSProperties = {
    padding: "4px 10px",
    border: "1px solid var(--mx-border)",
    borderRadius: 4,
    background: "var(--mx-panel)",
    fontSize: 11,
    cursor: "pointer",
    transition: "color .15s",
  };
  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: "var(--mx-green)",
    color: "#000",
    fontWeight: 700,
    borderColor: "var(--mx-green)",
  };
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    color: "var(--mx-muted)",
    cursor: "default",
  };
  const btnNormal: React.CSSProperties = {
    ...btnBase,
    color: "var(--mx-mid)",
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-4 select-none">
      {/* First */}
      <button
        style={page === 1 ? btnDisabled : btnNormal}
        disabled={page === 1}
        onClick={() => onPage(1)}
      >
        « First
      </button>

      {/* Previous */}
      <button
        style={page === 1 ? btnDisabled : btnNormal}
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        ‹ Prev
      </button>

      {/* Page window */}
      {buildWindow().map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ color: "var(--mx-muted)", fontSize: 11, padding: "0 4px" }}>
            …
          </span>
        ) : (
          <button
            key={p}
            style={p === page ? btnActive : btnNormal}
            onClick={() => p !== page && onPage(p as number)}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        style={page === totalPages ? btnDisabled : btnNormal}
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next ›
      </button>

      {/* Last */}
      <button
        style={page === totalPages ? btnDisabled : btnNormal}
        disabled={page === totalPages}
        onClick={() => onPage(totalPages)}
      >
        Last »
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AddressPage() {
  const params = useParams<{ addr: string }>();
  const addr = params.addr;

  const [info, setInfo] = useState<AddressInfo | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const totalPages = info ? Math.max(1, Math.ceil(info.total_tx_count / PAGE_SIZE)) : 1;

  // Fetch real balance from node once on mount (independent of page)
  useEffect(() => {
    api.balance(addr)
      .then((b) => setBalance(b.balance_sompi))
      .catch(() => setBalance(null));
  }, [addr]);

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      api
        .address(addr, PAGE_SIZE, (p - 1) * PAGE_SIZE)
        .then((data) => {
          setInfo(data);
          setLoading(false);
        })
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    },
    [addr]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  function handlePage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading && !info) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-8 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-8 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
          Address not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[10px]" style={{ color: "var(--mx-dim)" }}>
        <Link href="/explorer" className="hover:underline" style={{ color: "var(--mx-dim)" }}>
          Explorer
        </Link>
        {" / "}
        <span style={{ color: "var(--mx-mid)" }}>Address</span>
      </div>

      <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
        Address
      </h1>

      {/* Summary card */}
      <div className="card">
        <div className="flex gap-4 px-4 py-3 text-xs border-b" style={{ borderColor: "var(--mx-border)" }}>
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Address</span>
          <span className="break-all" style={{ color: "var(--mx-green)", fontFamily: "monospace" }}>{info.address}</span>
        </div>
        {/* Real balance from node UTXO set — always accurate */}
        <div className="flex gap-4 px-4 py-3 text-xs border-b" style={{ borderColor: "var(--mx-border)" }}>
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Balance</span>
          <span className="font-bold tabular-nums" style={{ color: "var(--mx-bright)" }}>
            {balance === null ? (
              <span style={{ color: "var(--mx-muted)" }}>—</span>
            ) : (
              `${sompiToKrx(balance)} KRX`
            )}
          </span>
        </div>
        <div className="flex gap-4 px-4 py-3 text-xs">
          <span className="w-36 shrink-0 uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>Indexed txs</span>
          <span style={{ color: "var(--mx-mid)" }}>{info.total_tx_count.toLocaleString()}</span>
        </div>
      </div>

      {/* Transaction list */}
      {info.total_tx_count > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--mx-dim)" }}>
              Transaction History
            </h2>
            <span className="text-[10px]" style={{ color: "var(--mx-muted)" }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, info.total_tx_count)} of {info.total_tx_count.toLocaleString()}
            </span>
          </div>

          <div className="text-[9px] uppercase tracking-widest flex items-center gap-4 px-4 pb-2 border-b"
               style={{ color: "var(--mx-muted)", borderColor: "var(--mx-border)" }}>
            <span className="w-24 shrink-0">DAA Score</span>
            <span className="flex-1">TX ID</span>
            <span className="w-32 text-right shrink-0">Amount (KRX)</span>
          </div>

          <div className="flex flex-col gap-1" style={{ opacity: loading ? 0.5 : 1, transition: "opacity .15s" }}>
            {info.transactions.map((tx, i) => (
              <div key={i} className="card card-hover flex items-center gap-4 px-4 py-3 text-xs">
                <span className="w-24 shrink-0 tabular-nums" style={{ color: "var(--mx-green)" }}>
                  #{tx.daa_score.toLocaleString()}
                </span>
                <Link
                  href={`/tx/${tx.tx_id}`}
                  className="flex-1 truncate hover:underline"
                  style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}
                >
                  {shortHash(tx.tx_id, 20)}
                </Link>
                <span className="w-32 text-right shrink-0 tabular-nums" style={{ color: "var(--mx-mid)" }}>
                  +{sompiToKrx(tx.amount_sompi)}
                </span>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
        </div>
      ) : (
        <div className="card p-8 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
          No transactions found for this address.
        </div>
      )}
    </div>
  );
}
