"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Block, shortHash } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
const MAX_VISIBLE = 20;
const DEQUEUE_FAST = 80;
const DEQUEUE_SLOW = 250;

interface DisplayBlock extends Block {
  animKey: string;
  isNew: boolean;
}

export default function LiveBlocks({ initial }: { initial: Block[] }) {
  const [rows, setRows] = useState<DisplayBlock[]>(
    initial.slice(0, MAX_VISIBLE).map((b) => ({ ...b, animKey: b.hash, isNew: false }))
  );

  const knownRef = useRef<Set<string>>(new Set(initial.map((b) => b.hash)));
  const queueRef = useRef<Block[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dequeue = useCallback(() => {
    if (queueRef.current.length === 0) { timerRef.current = null; return; }
    const next = queueRef.current.shift()!;

    setRows((prev) => {
      const entry: DisplayBlock = { ...next, animKey: `${next.hash}-${Date.now()}`, isNew: true };
      return [entry, ...prev].slice(0, MAX_VISIBLE);
    });
    setTimeout(() => {
      setRows((prev) => prev.map((b) => (b.hash === next.hash ? { ...b, isNew: false } : b)));
    }, 1200);

    const delay = queueRef.current.length > 3 ? DEQUEUE_FAST : DEQUEUE_SLOW;
    timerRef.current = setTimeout(dequeue, delay);
  }, []);

  useEffect(() => {
    const es = new EventSource(`${API}/api/v1/events`);
    es.addEventListener("live", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { blocks?: Block[] };
        const incoming = (data.blocks ?? [])
          .filter((b) => !knownRef.current.has(b.hash))
          .sort((a, b) => a.daa_score - b.daa_score);
        if (incoming.length > 0) {
          incoming.forEach((b) => knownRef.current.add(b.hash));
          queueRef.current.push(...incoming);
          if (!timerRef.current) timerRef.current = setTimeout(dequeue, 0);
        }
      } catch {}
    });
    return () => {
      es.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dequeue]);

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      {rows.map((block) => <BlockRow key={block.animKey} block={block} />)}
    </div>
  );
}

function BlockRow({ block }: { block: DisplayBlock }) {
  const age = Math.floor((Date.now() - block.timestamp_ms) / 1000);
  const ageStr =
    age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-xs ${block.isNew ? "block-enter" : ""}`}
      style={{
        background: block.isNew ? "rgba(0,229,51,0.04)" : "var(--mx-surface)",
        border: `1px solid ${block.isNew ? "var(--mx-dim)" : "var(--mx-border)"}`,
        borderRadius: "2px",
        transition: "background 0.9s ease, border-color 0.9s ease",
      }}
    >
      {/* DAA Score */}
      <span className="w-24 shrink-0 font-bold tabular-nums"
            style={{ color: block.isNew ? "var(--mx-bright)" : "var(--mx-green)", transition: "color 0.9s ease" }}>
        #{block.daa_score.toLocaleString()}
      </span>

      {/* Hash */}
      <Link href={`/blocks/${block.hash}`}
            className="flex-1 truncate hover:underline"
            style={{ color: block.isNew ? "var(--mx-mid)" : "var(--mx-dim)", fontFamily: "monospace", transition: "color 0.9s ease" }}>
        {shortHash(block.hash, 18)}
      </Link>

      {/* Tx count */}
      <span className="w-14 text-right shrink-0 tabular-nums"
            style={{ color: block.tx_count > 1 ? "var(--mx-mid)" : "var(--mx-dim)" }}>
        {block.tx_count}<span style={{ color: "var(--mx-muted)", fontSize: "9px" }}> tx</span>
      </span>

      {/* Chain */}
      <span className="w-10 text-right shrink-0"
            style={{ color: block.is_chain_block ? "var(--mx-mid)" : "var(--mx-muted)", fontSize: "9px", letterSpacing: "0.05em" }}>
        {block.is_chain_block ? "CHAIN" : "DAG"}
      </span>

      {/* Age */}
      <span suppressHydrationWarning className="w-10 text-right shrink-0"
            style={{ color: "var(--mx-dim)", fontSize: "9px" }}>
        {ageStr}
      </span>
    </div>
  );
}
