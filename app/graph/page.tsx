"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api, type GraphBlock, formatTimestamp, shortHash } from "@/lib/api";

// ── Layout constants ──────────────────────────────────────────────────────────

const NODE_W = 22;
const NODE_H = 14;
const COL_W  = 28;   // horizontal space per DAA-score column
const LANE_H = 26;   // vertical space per lane
const MX     = 16;   // horizontal margin
const MY     = 16;   // vertical margin

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg:         "#000000",
  gridLine:   "rgba(0,229,51,0.04)",
  chainFill:  "#001a00",
  chainStroke:"#39ff14",
  chainText:  "#39ff14",
  ghostFill:  "#050505",
  ghostStroke:"#006616",
  ghostText:  "#006616",
  selFill:    "#003300",
  selStroke:  "#39ff14",
  edgeChain:  "rgba(57,255,20,0.45)",
  edgeGhost:  "rgba(0,102,22,0.35)",
  labelColor: "rgba(0,229,51,0.25)",
};

// ── Lane assignment ───────────────────────────────────────────────────────────

interface NodePos {
  col:  number;   // column index (0 = oldest)
  lane: number;   // row index (0 = top)
  x:    number;   // pixel left edge
  y:    number;   // pixel top edge
}

const CANVAS_H = 516;

function computeLayout(blocks: GraphBlock[]): {
  positions: Map<string, NodePos>;
  totalCols: number;
  totalLanes: number;
} {
  if (blocks.length === 0) return { positions: new Map(), totalCols: 0, totalLanes: 1 };

  const minDaa = blocks[0].daa_score;

  const byDaa = new Map<number, GraphBlock[]>();
  for (const b of blocks) {
    const arr = byDaa.get(b.daa_score) ?? [];
    arr.push(b);
    byDaa.set(b.daa_score, arr);
  }

  const daaScores = [...byDaa.keys()].sort((a, b) => a - b);

  // First pass: assign lanes (without y position yet)
  const laneMap = new Map<string, { col: number; lane: number }>();
  for (const daa of daaScores) {
    const col = daa - minDaa;
    const group = [...(byDaa.get(daa) ?? [])].sort((a, b) => {
      if (a.is_chain_block !== b.is_chain_block) return a.is_chain_block ? -1 : 1;
      return a.hash.localeCompare(b.hash);
    });
    const usedLanes = new Set<number>();
    for (const b of group) {
      const parentLanes = b.parents
        .map(ph => laneMap.get(ph)?.lane)
        .filter((l): l is number => l !== undefined && !usedLanes.has(l));
      let lane: number;
      if (parentLanes.length > 0) {
        lane = parentLanes[0];
      } else {
        let l = 0;
        while (usedLanes.has(l)) l++;
        lane = l;
      }
      usedLanes.add(lane);
      laneMap.set(b.hash, { col, lane });
    }
  }

  // Compute total lanes, then derive laneH to fill the canvas
  const totalLanes = Math.max(...[...laneMap.values()].map(p => p.lane)) + 1;
  const effectiveLaneH = Math.max(LANE_H, Math.floor((CANVAS_H - MY * 2) / totalLanes));

  // Second pass: compute pixel positions
  const positions = new Map<string, NodePos>();
  for (const [hash, { col, lane }] of laneMap) {
    positions.set(hash, {
      col,
      lane,
      x: MX + col * COL_W,
      y: MY + lane * effectiveLaneH,
    });
  }

  const totalCols = (daaScores[daaScores.length - 1] ?? minDaa) - minDaa + 1;
  return { positions, totalCols, totalLanes };
}

// ── Edge path (cubic bezier) ──────────────────────────────────────────────────

function edgePath(px: number, py: number, cx: number, cy: number): string {
  const sx = px + NODE_W;
  const sy = py + NODE_H / 2;
  const ex = cx;
  const ey = cy + NODE_H / 2;
  const dx = Math.abs(ex - sx) * 0.45;
  return `M${sx},${sy} C${sx + dx},${sy} ${ex - dx},${ey} ${ex},${ey}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GraphPage() {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [blocks,   setBlocks]   = useState<GraphBlock[]>([]);
  const [selected, setSelected] = useState<GraphBlock | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [paused,   setPaused]   = useState(false);
  const [limit,    setLimit]    = useState(120);

  const fetchBlocks = useCallback(async () => {
    try {
      const data = await api.graph(limit);
      setBlocks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [limit]);

  // Initial fetch + polling (2 s)
  useEffect(() => {
    fetchBlocks();
    if (paused) return;
    const id = setInterval(fetchBlocks, 2000);
    return () => clearInterval(id);
  }, [fetchBlocks, paused]);

  // Auto-scroll to right when new blocks arrive
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [blocks, paused]);

  const { positions, totalCols, totalLanes } = computeLayout(blocks);

  const svgW = MX * 2 + totalCols * COL_W;
  const svgH = CANVAS_H;

  // Build a hash-lookup for parent's block data
  const blockMap = new Map(blocks.map(b => [b.hash, b]));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-[10px]" style={{ color: "var(--mx-dim)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Home</Link>
        {" / "}
        <span style={{ color: "var(--mx-mid)" }}>BlockDAG Inspector</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
          BlockDAG Inspector
        </h1>
        <span className="text-[9px] px-2 py-0.5 border"
              style={{ color: "var(--mx-dim)", borderColor: "var(--mx-muted)" }}>
          LIVE
        </span>

        {/* Controls */}
        <div className="flex items-center gap-3 ml-auto">
          <label className="text-[10px] flex items-center gap-2" style={{ color: "var(--mx-dim)" }}>
            DEPTH
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="text-[10px] px-1 py-0.5 rounded-none"
              style={{ background: "#020802", border: "1px solid var(--mx-border)", color: "var(--mx-mid)" }}
            >
              <option value={40}>40</option>
              <option value={80}>80</option>
              <option value={120}>120</option>
              <option value={200}>200</option>
            </select>
          </label>
          <button
            onClick={() => setPaused(p => !p)}
            className="text-[10px] px-3 py-1 border transition-colors"
            style={{
              borderColor: paused ? "var(--mx-bright)" : "var(--mx-border)",
              color: paused ? "var(--mx-bright)" : "var(--mx-dim)",
            }}
          >
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-3 text-xs" style={{ borderColor: "var(--mx-error)", color: "var(--mx-error)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-[9px] uppercase tracking-widest" style={{ color: "var(--mx-muted)" }}>
        <span className="flex items-center gap-2">
          <span className="inline-block w-8 h-3 border" style={{ background: "#001a00", borderColor: "#39ff14" }} />
          chain block
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-8 h-3 border" style={{ background: "#050505", borderColor: "#006616" }} />
          non-chain
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-8 border-t" style={{ borderColor: "rgba(57,255,20,0.45)" }} />
          parent edge
        </span>
        <span className="ml-auto" style={{ color: "var(--mx-dim)" }}>
          ← older &nbsp;&nbsp; newer →
        </span>
      </div>

      {/* DAG canvas */}
      <div className="flex gap-4" style={{ height: "520px" }}>
        {/* Scrollable SVG */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto card"
          style={{ cursor: "default", minWidth: 0 }}
        >
          <svg
            width={svgW}
            height={svgH}
            style={{ display: "block", background: C.bg }}
          >
            {/* Subtle horizontal grid lines */}
            {Array.from({ length: Math.max(4, totalLanes) + 1 }, (_, i) => (
              <line
                key={`grid-h-${i}`}
                x1={0} y1={MY + i * LANE_H - LANE_H / 2}
                x2={svgW} y2={MY + i * LANE_H - LANE_H / 2}
                stroke={C.gridLine} strokeWidth={1}
              />
            ))}

            {/* DAA score column labels */}
            {blocks
              .filter((b, idx, arr) =>
                arr.findIndex(x => x.daa_score === b.daa_score) === idx
              )
              .map(b => {
                const pos = positions.get(b.hash);
                if (!pos) return null;
                return (
                  <text
                    key={`lbl-${b.daa_score}`}
                    x={MX + pos.col * COL_W + NODE_W / 2}
                    y={svgH - 6}
                    textAnchor="middle"
                    fontSize={8}
                    fill={C.labelColor}
                    fontFamily="monospace"
                  >
                    {b.daa_score}
                  </text>
                );
              })}

            {/* Edges (drawn first so nodes appear on top) */}
            {blocks.map(child => {
              const cp = positions.get(child.hash);
              if (!cp) return null;
              return child.parents.map(ph => {
                const pp = positions.get(ph);
                if (!pp) return null; // parent outside viewport
                const parentBlock = blockMap.get(ph);
                const isChainEdge = child.is_chain_block && parentBlock?.is_chain_block;
                return (
                  <path
                    key={`e-${child.hash}-${ph}`}
                    d={edgePath(pp.x, pp.y, cp.x, cp.y)}
                    fill="none"
                    stroke={isChainEdge ? C.edgeChain : C.edgeGhost}
                    strokeWidth={isChainEdge ? 1.5 : 1}
                  />
                );
              });
            })}

            {/* Nodes */}
            {blocks.map(b => {
              const pos = positions.get(b.hash);
              if (!pos) return null;
              const isSelected = selected?.hash === b.hash;
              const isChain    = b.is_chain_block;

              const fill   = isSelected ? C.selFill   : isChain ? C.chainFill  : C.ghostFill;
              const stroke = isSelected ? C.selStroke : isChain ? C.chainStroke: C.ghostStroke;
              const textC  = isChain ? C.chainText : C.ghostText;

              return (
                <g
                  key={b.hash}
                  onClick={() => setSelected(prev => prev?.hash === b.hash ? null : b)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Glow for chain blocks */}
                  {isChain && (
                    <rect
                      x={pos.x - 2} y={pos.y - 2}
                      width={NODE_W + 4} height={NODE_H + 4}
                      rx={2} fill="none"
                      stroke="rgba(57,255,20,0.12)"
                      strokeWidth={4}
                    />
                  )}
                  <rect
                    x={pos.x} y={pos.y}
                    width={NODE_W} height={NODE_H}
                    rx={1}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  {/* Center dot */}
                  <circle
                    cx={pos.x + NODE_W / 2}
                    cy={pos.y + NODE_H / 2}
                    r={2}
                    fill={textC}
                    opacity={0.8}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            className="card flex flex-col gap-3 p-4 shrink-0"
            style={{ width: 260, fontSize: "11px", color: "var(--mx-mid)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--mx-dim)" }}>
                Block Detail
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-[10px]"
                style={{ color: "var(--mx-muted)" }}
              >
                ✕
              </button>
            </div>

            {[
              { label: "Hash",      value: shortHash(selected.hash, 10), mono: true },
              { label: "DAA Score", value: selected.daa_score.toLocaleString() },
              { label: "Blue Score",value: selected.blue_score.toLocaleString() },
              { label: "TX Count",  value: selected.tx_count.toString() },
              { label: "Status",    value: selected.is_chain_block ? "CHAIN" : "NON-CHAIN" },
              { label: "Time",      value: formatTimestamp(selected.timestamp_ms) },
              { label: "Parents",   value: `${selected.parents.length}` },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>
                  {label}
                </span>
                <span
                  style={{
                    color: label === "Status"
                      ? (selected.is_chain_block ? "var(--mx-bright)" : "var(--mx-muted)")
                      : "var(--mx-mid)",
                    fontFamily: mono ? "monospace" : undefined,
                    fontSize: "10px",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}

            {/* Parent hashes */}
            {selected.parents.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>
                  Parent hashes
                </span>
                {selected.parents.map(ph => (
                  <Link
                    key={ph}
                    href={`/blocks/${ph}`}
                    className="text-[10px] hover:underline truncate"
                    style={{ color: "var(--mx-dim)", fontFamily: "monospace" }}
                  >
                    {shortHash(ph, 10)}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href={`/blocks/${selected.hash}`}
              className="text-[10px] uppercase tracking-widest border px-3 py-1.5 text-center mt-auto hover:border-green-500 transition-colors"
              style={{ borderColor: "var(--mx-border)", color: "var(--mx-mid)" }}
            >
              View block →
            </Link>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-[9px] uppercase tracking-widest border-t pt-3"
           style={{ borderColor: "var(--mx-border)", color: "var(--mx-muted)" }}>
        <span>
          <span style={{ color: "var(--mx-mid)" }}>{blocks.length}</span> blocks
        </span>
        <span>
          <span style={{ color: "var(--mx-bright)" }}>
            {blocks.filter(b => b.is_chain_block).length}
          </span> chain
        </span>
        <span>
          <span style={{ color: "var(--mx-dim)" }}>
            {blocks.filter(b => !b.is_chain_block).length}
          </span> non-chain
        </span>
        <span>
          <span style={{ color: "var(--mx-mid)" }}>{totalCols}</span> daa columns
        </span>
        <span>
          <span style={{ color: "var(--mx-mid)" }}>
            {blocks.length > 0 ? blocks[blocks.length - 1].daa_score.toLocaleString() : "—"}
          </span> tip daa
        </span>
        {paused && (
          <span style={{ color: "var(--mx-bright)" }}>⏸ PAUSED</span>
        )}
      </div>
    </div>
  );
}
