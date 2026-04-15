"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Transaction, shortHash, sompiToKrx } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
const MAX_VISIBLE = 20;
const DEQUEUE_FAST = 80;
const DEQUEUE_SLOW = 250;

async function fetchTxs(): Promise<Transaction[]> {
  const res = await fetch(`${API}/api/v1/transactions?limit=100`, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

interface DisplayTx extends Transaction {
  animKey: string;
  isNew: boolean;
}

export default function LiveTransactions({ initial }: { initial: Transaction[] }) {
  const [rows, setRows] = useState<DisplayTx[]>(
    initial.slice(0, MAX_VISIBLE).map((t) => ({ ...t, animKey: t.tx_id, isNew: false }))
  );

  const knownRef = useRef<Set<string>>(new Set(initial.map((t) => t.tx_id)));
  const queueRef = useRef<Transaction[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dequeue = useCallback(() => {
    if (queueRef.current.length === 0) { timerRef.current = null; return; }
    const next = queueRef.current.shift()!;

    setRows((prev) => {
      const entry: DisplayTx = { ...next, animKey: `${next.tx_id}-${Date.now()}`, isNew: true };
      return [entry, ...prev].slice(0, MAX_VISIBLE);
    });
    setTimeout(() => {
      setRows((prev) => prev.map((t) => (t.tx_id === next.tx_id ? { ...t, isNew: false } : t)));
    }, 1200);

    const delay = queueRef.current.length > 3 ? DEQUEUE_FAST : DEQUEUE_SLOW;
    timerRef.current = setTimeout(dequeue, delay);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const fresh = await fetchTxs();
        const incoming = fresh.filter((t) => !knownRef.current.has(t.tx_id));
        if (incoming.length > 0) {
          incoming.forEach((t) => knownRef.current.add(t.tx_id));
          queueRef.current.push(...incoming);
          if (!timerRef.current) timerRef.current = setTimeout(dequeue, 0);
        }
      } catch {}
    };
    const id = setInterval(poll, 500);
    return () => { clearInterval(id); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dequeue]);

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      {rows.map((tx) => <TxRow key={tx.animKey} tx={tx} />)}
    </div>
  );
}

function TxRow({ tx }: { tx: DisplayTx }) {
  const hasPayload = tx.payload_hex && tx.payload_hex.length > 0;

  // Border hierarchy: coinbase > AI > new transaction > normal
  const borderColor = tx.is_coinbase
    ? "var(--mx-dim)"
    : hasPayload
    ? "var(--mx-mid)"
    : tx.isNew
    ? "var(--mx-dim)"
    : "var(--mx-border)";

  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 text-xs ${tx.isNew ? "block-enter" : ""}`}
      style={{
        background: tx.isNew ? "rgba(0,229,51,0.03)" : "var(--mx-surface)",
        border: `1px solid ${borderColor}`,
        borderRadius: "2px",
        transition: "background 0.9s ease, border-color 0.9s ease",
      }}
    >
      {/* Line 1: TX ID + badges */}
      <div className="flex items-center gap-2">
        <Link href={`/tx/${tx.tx_id}`}
              className="flex-1 truncate hover:underline"
              style={{
                fontFamily: "monospace",
                color: tx.isNew ? "var(--mx-green)" : "var(--mx-dim)",
                transition: "color 0.9s ease",
              }}>
          {shortHash(tx.tx_id, 16)}
        </Link>

        {tx.is_coinbase && (
          <span className="shrink-0 px-1.5 py-px rounded-sm text-[9px] font-bold"
                style={{ color: "var(--mx-dim)", border: "1px solid var(--mx-muted)", letterSpacing: "0.1em" }}>
            COINBASE
          </span>
        )}
        {hasPayload && !tx.is_coinbase && (
          <span className="shrink-0 px-1.5 py-px rounded-sm text-[9px] font-bold"
                style={{ color: "var(--mx-mid)", border: "1px solid var(--mx-dim)", letterSpacing: "0.1em" }}>
            AI
          </span>
        )}
      </div>

      {/* Line 2: block + amount */}
      <div className="flex items-center justify-between">
        <Link href={`/blocks/${tx.block_hash}`}
              className="text-[9px] hover:underline truncate max-w-[55%]"
              style={{ color: "var(--mx-muted)", fontFamily: "monospace" }}>
          {shortHash(tx.block_hash, 12)}
        </Link>
        <span className="font-bold tabular-nums"
              style={{ color: "var(--mx-mid)" }}>
          {sompiToKrx(tx.total_out_sompi)} KRX
        </span>
      </div>
    </div>
  );
}
