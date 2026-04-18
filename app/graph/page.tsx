"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api, type GraphBlock, formatTimestamp, shortHash } from "@/lib/api";

// ── Layout constants (inspired by dagpulse) ───────────────────────────────────
const BLOCK_RADIUS = 14;
const SPACING_X    = 55;
const SPACING_Y    = 46;
const POLL_MS      = 2000;

// ── Keryx color palette ───────────────────────────────────────────────────────
const C = {
  bg:           "#000a00",
  gridLine:     "rgba(0,229,51,0.04)",
  chainFill:    "#0e2a0e",
  chainStroke:  "#39ff14",
  chainEdge:    "rgba(57,255,20,0.55)",
  chainGlow:    "rgba(57,255,20,0.22)",
  ghostFill:    "rgba(239,68,68,0.18)",
  ghostStroke:  "#ef4444",
  ghostEdge:    "rgba(239,68,68,0.22)",
  ghostGlow:    "rgba(239,68,68,0.12)",
  selectedRing: "#f59e0b",
  selectedEdge: "rgba(245,158,11,0.85)",
  hoveredEdge:  "rgba(57,255,20,0.90)",
  vignetteColor:"#000a00",
};

// ── Internal animated block state ─────────────────────────────────────────────
interface RenderBlock extends GraphBlock {
  x:            number;
  y:            number;
  targetX:      number;
  targetY:      number;
  opacity:      number;
  scale:        number;
  glowIntensity:number;
  addedAt:      number;
}

// ── Layout: group by daa_score, spread vertically around center ───────────────
function layoutBlocks(blocks: RenderBlock[], canvasH: number): void {
  if (blocks.length === 0) return;

  const minDaa = Math.min(...blocks.map(b => b.daa_score));
  const columns = new Map<number, RenderBlock[]>();
  for (const b of blocks) {
    const arr = columns.get(b.daa_score) ?? [];
    arr.push(b);
    columns.set(b.daa_score, arr);
  }

  const centerY = canvasH / 2;

  for (const [daa, col] of columns) {
    const x = (daa - minDaa) * SPACING_X;
    // chain blocks first, then by hash for stability
    col.sort((a, b) => {
      if (a.is_chain_block !== b.is_chain_block) return a.is_chain_block ? -1 : 1;
      return a.hash.localeCompare(b.hash);
    });
    const spread = col.length - 1;
    for (let j = 0; j < col.length; j++) {
      const yOffset = spread === 0 ? 0 : (j - spread / 2) * SPACING_Y;
      col[j].targetX = x;
      col[j].targetY = centerY + yOffset;
    }
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────
function render(
  ctx: CanvasRenderingContext2D,
  blocks: RenderBlock[],
  blockMap: Map<string, RenderBlock>,
  offsetX: number,
  offsetY: number,
  zoom: number,
  selectedHash: string | null,
  hoveredHash: string | null,
  w: number,
  h: number,
) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, offsetX, offsetY, zoom, w, h);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  drawEdges(ctx, blocks, blockMap, selectedHash, hoveredHash);

  for (const b of blocks) {
    if (b.opacity < 0.05) continue;
    drawBlock(ctx, b, selectedHash, hoveredHash);
  }

  ctx.restore();
  drawVignette(ctx, w, h);
}

function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, zoom: number, w: number, h: number) {
  const gridSize = 80 * zoom;
  if (gridSize < 15) return;
  ctx.strokeStyle = C.gridLine;
  ctx.lineWidth = 0.5;
  const sx = ((ox % gridSize) + gridSize) % gridSize;
  const sy = ((oy % gridSize) + gridSize) % gridSize;
  ctx.beginPath();
  for (let x = sx; x < w; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = sy; y < h; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  blocks: RenderBlock[],
  blockMap: Map<string, RenderBlock>,
  selectedHash: string | null,
  hoveredHash: string | null,
) {
  type Edge = { from: RenderBlock; to: RenderBlock; highlighted: boolean };
  const normal: Edge[] = [];
  const highlight: Edge[] = [];

  for (const block of blocks) {
    if (block.opacity < 0.05) continue;
    for (const ph of block.parents) {
      const parent = blockMap.get(ph);
      if (!parent || parent.opacity < 0.05) continue;
      const isHL =
        selectedHash === block.hash || selectedHash === parent.hash ||
        hoveredHash  === block.hash || hoveredHash  === parent.hash;
      (isHL ? highlight : normal).push({ from: parent, to: block, highlighted: isHL });
    }
  }

  for (const e of normal)    drawEdge(ctx, e.from, e.to, selectedHash, hoveredHash, false);
  for (const e of highlight) drawEdge(ctx, e.from, e.to, selectedHash, hoveredHash, true);
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  from: RenderBlock,
  to: RenderBlock,
  selectedHash: string | null,
  hoveredHash: string | null,
  highlighted: boolean,
) {
  const isSelected = selectedHash === to.hash || selectedHash === from.hash;
  const isHovered  = hoveredHash  === to.hash || hoveredHash  === from.hash;

  const dx = to.x - from.x;
  const cp = Math.max(15, Math.abs(dx) * 0.35);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x + cp, from.y, to.x - cp, to.y, to.x, to.y);

  if (isSelected) {
    ctx.strokeStyle = C.selectedEdge;
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = 0.9;
  } else if (isHovered) {
    ctx.strokeStyle = C.hoveredEdge;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.8;
  } else {
    const isChainEdge = to.is_chain_block && from.is_chain_block;
    ctx.strokeStyle = isChainEdge ? C.chainEdge : C.ghostEdge;
    ctx.lineWidth   = isChainEdge ? 1.5 : 1;
    ctx.globalAlpha = Math.min(from.opacity, to.opacity) * 0.7;
  }

  ctx.stroke();

  // Arrow head toward child
  if (highlighted || ctx.globalAlpha > 0.35) {
    ctx.fillStyle = ctx.strokeStyle;
    drawArrow(ctx, from, to, cp, highlighted);
  }

  ctx.globalAlpha = 1;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: RenderBlock,
  to: RenderBlock,
  cp: number,
  big: boolean,
) {
  const cp2x = to.x - cp;
  const tanX = to.x - cp2x;
  const tanY = to.y - to.y; // 0 at endpoint
  const len  = Math.sqrt(tanX * tanX + tanY * tanY);
  if (len < 0.01) return;

  const nx = tanX / len;
  const sz = big ? 6 : 4;
  const off = BLOCK_RADIUS + 2;

  const tipX = to.x - nx * off;
  const tipY = to.y;
  const px = 0, py = 1; // perpendicular (horizontal edges)

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - nx * sz - px * sz * 0.5, tipY - py * sz * 0.5);
  ctx.lineTo(tipX - nx * sz + px * sz * 0.5, tipY + py * sz * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: RenderBlock,
  selectedHash: string | null,
  hoveredHash: string | null,
) {
  const r          = BLOCK_RADIUS * block.scale;
  const isSelected = selectedHash === block.hash;
  const isHovered  = hoveredHash  === block.hash;
  const isChain    = block.is_chain_block;

  ctx.globalAlpha = block.opacity;

  // Glow on new blocks
  if (block.glowIntensity > 0.02) {
    const glowR = r + 10 * block.glowIntensity;
    ctx.beginPath();
    ctx.arc(block.x, block.y, glowR, 0, Math.PI * 2);
    const intensity = block.glowIntensity * 0.3;
    ctx.fillStyle = isChain
      ? `rgba(57,255,20,${intensity})`
      : `rgba(239,68,68,${intensity * 0.7})`;
    ctx.fill();
  }

  // Body
  ctx.beginPath();
  ctx.arc(block.x, block.y, r, 0, Math.PI * 2);
  ctx.fillStyle = isChain
    ? (isHovered ? "#1a4d1a" : C.chainFill)
    : (isHovered ? "#4d1a1a" : C.ghostFill);
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(block.x, block.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = isChain ? C.chainStroke : C.ghostStroke;
  ctx.lineWidth   = isSelected ? 2.5 : 1.5;
  ctx.stroke();

  // Selection ring (amber)
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(block.x, block.y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = C.selectedRing;
    ctx.lineWidth   = 2;
    ctx.stroke();
  }

  // TX dot (amber) if block has user txs
  if (block.tx_count > 1) {
    ctx.beginPath();
    ctx.arc(block.x + r * 0.65, block.y - r * 0.65, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fade = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, C.vignetteColor);
    g.addColorStop(1, "rgba(0,10,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  fade(0, 0, 70, 0,   0,    0,    70,  h);
  fade(w - 70, 0, w, 0, w - 70, 0, 70, h);
  fade(0, 0, 0, 50,   0,    0,    w,  50);
  fade(0, h - 50, 0, h, 0, h - 50, w, 50);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GraphPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const stateRef    = useRef({
    blocks:       [] as RenderBlock[],
    blockMap:     new Map<string, RenderBlock>(),
    offsetX:      100,
    offsetY:      0,
    zoom:         1,
    isDragging:   false,
    lastMouseX:   0,
    lastMouseY:   0,
    selectedHash: null as string | null,
    hoveredHash:  null as string | null,
    paused:       false,
    limit:        120,
    rafId:        0,
  });
  const [selected,  setSelected]  = useState<GraphBlock | null>(null);
  const [paused,    setPaused]    = useState(false);
  const [limit,     setLimit]     = useState(120);
  const [stats,     setStats]     = useState({ total: 0, chain: 0, ghost: 0, cols: 0, tip: 0 });
  const [error,     setError]     = useState<string | null>(null);

  // Keep stateRef in sync with React state
  useEffect(() => { stateRef.current.paused = paused; }, [paused]);
  useEffect(() => { stateRef.current.limit  = limit;  }, [limit]);

  // ── Fetch & merge blocks ───────────────────────────────────────────────────
  const fetchBlocks = useCallback(async () => {
    try {
      const fresh = await api.graph(stateRef.current.limit);
      const s     = stateRef.current;
      const now   = performance.now();

      // Merge: keep existing animated state, add new blocks
      const next = new Map<string, RenderBlock>();
      for (const b of fresh) {
        const existing = s.blockMap.get(b.hash);
        if (existing) {
          // Update fields that may change (is_chain_block via VirtualChainChanged)
          existing.is_chain_block = b.is_chain_block;
          existing.parents        = b.parents;
          next.set(b.hash, existing);
        } else {
          // New block — start invisible at targetX/Y (will lerp in)
          next.set(b.hash, {
            ...b,
            x:             s.offsetX > 100 ? s.blocks[s.blocks.length - 1]?.x ?? 0 : 0,
            y:             0,
            targetX:       0,
            targetY:       0,
            opacity:       0,
            scale:         0.5,
            glowIntensity: 1,
            addedAt:       now,
          });
        }
      }

      s.blocks   = [...next.values()];
      s.blockMap = next;

      const minDaa = Math.min(...s.blocks.map(b => b.daa_score));
      const maxDaa = Math.max(...s.blocks.map(b => b.daa_score));
      setStats({
        total: s.blocks.length,
        chain: s.blocks.filter(b => b.is_chain_block).length,
        ghost: s.blocks.filter(b => !b.is_chain_block).length,
        cols:  maxDaa - minDaa + 1,
        tip:   maxDaa,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ── Animation loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let last = performance.now();

    function loop(now: number) {
      const dt = now - last;
      last = now;
      const s = stateRef.current;
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;

      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width  = w;
        canvas!.height = h;
      }

      // Layout target positions
      layoutBlocks(s.blocks, h);

      // Lerp animation
      const lerpSpeed = 1 - Math.pow(0.001, dt / 1000);
      for (const b of s.blocks) {
        b.x += (b.targetX - b.x) * lerpSpeed;
        b.y += (b.targetY - b.y) * lerpSpeed;

        const age = now - b.addedAt;
        b.opacity       = age < 400 ? Math.min(1, age / 250) : 1;
        b.scale         = age < 400 ? 0.5 + Math.min(0.5, age / 250) * 0.5 : 1;
        b.glowIntensity = age < 1500 ? 1 - age / 1500 : 0;
      }

      // Auto-scroll to newest blocks when not paused
      if (!s.paused && s.blocks.length > 0) {
        const maxTX = Math.max(...s.blocks.map(b => b.targetX));
        const target = w - maxTX * s.zoom - 80;
        s.offsetX += (target - s.offsetX) * 0.05;
      }

      render(ctx, s.blocks, s.blockMap, s.offsetX, s.offsetY, s.zoom, s.selectedHash, s.hoveredHash, w, h);
      s.rafId = requestAnimationFrame(loop);
    }

    stateRef.current.rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.rafId);
  }, []);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBlocks();
    if (paused) return;
    const id = setInterval(fetchBlocks, POLL_MS);
    return () => clearInterval(id);
  }, [fetchBlocks, paused, limit]);

  // ── Mouse: pan + zoom + click + hover ─────────────────────────────────────
  const hitTest = useCallback((canvasX: number, canvasY: number): RenderBlock | null => {
    const s = stateRef.current;
    const wx = (canvasX - s.offsetX) / s.zoom;
    const wy = (canvasY - s.offsetY) / s.zoom;
    for (let i = s.blocks.length - 1; i >= 0; i--) {
      const b  = s.blocks[i];
      const dx = wx - b.x;
      const dy = wy - b.y;
      if (dx * dx + dy * dy < BLOCK_RADIUS * BLOCK_RADIUS * 2.25) return b;
    }
    return null;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    s.isDragging  = true;
    s.lastMouseX  = e.clientX;
    s.lastMouseY  = e.clientY;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    s.hoveredHash = hitTest(cx, cy)?.hash ?? null;

    if (s.isDragging) {
      s.offsetX += e.clientX - s.lastMouseX;
      s.offsetY += e.clientY - s.lastMouseY;
      s.lastMouseX = e.clientX;
      s.lastMouseY = e.clientY;
    }
  }, [hitTest]);

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const wasDragging = s.isDragging;
    s.isDragging = false;

    if (!wasDragging) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = hitTest(cx, cy);

    if (hit) {
      if (s.selectedHash === hit.hash) {
        s.selectedHash = null;
        setSelected(null);
      } else {
        s.selectedHash = hit.hash;
        setSelected(hit);
      }
    } else {
      s.selectedHash = null;
      setSelected(null);
    }
  }, [hitTest]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const s     = stateRef.current;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const nz     = Math.max(0.25, Math.min(3, s.zoom * factor));
    const mx     = e.nativeEvent.offsetX;
    const my     = e.nativeEvent.offsetY;
    const scale  = nz / s.zoom;
    s.offsetX    = mx - (mx - s.offsetX) * scale;
    s.offsetY    = my - (my - s.offsetY) * scale;
    s.zoom       = nz;
  }, []);

  const onMouseLeave = useCallback(() => {
    stateRef.current.hoveredHash = null;
  }, []);

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 120px)", minHeight: 520 }}>

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap shrink-0">
        <div>
          <div className="text-[10px] mb-1" style={{ color: "var(--mx-dim)" }}>
            <Link href="/explorer" className="hover:underline" style={{ color: "var(--mx-dim)" }}>Explorer</Link>
            {" / "}
            <span style={{ color: "var(--mx-mid)" }}>BlockDAG Inspector</span>
          </div>
          <h1 className="text-lg font-bold tracking-[0.2em] uppercase" style={{ color: "var(--mx-bright)" }}>
            BlockDAG Inspector
          </h1>
        </div>

        <span className="text-[9px] px-2 py-0.5 border animate-pulse"
              style={{ color: "var(--mx-dim)", borderColor: "var(--mx-muted)" }}>
          LIVE
        </span>

        <div className="flex items-center gap-3 ml-auto">
          <label className="text-[10px] flex items-center gap-2" style={{ color: "var(--mx-dim)" }}>
            DEPTH
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="text-[10px] px-1 py-0.5 rounded-none"
              style={{ background: "#010a01", border: "1px solid var(--mx-border)", color: "var(--mx-mid)" }}
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
              color:       paused ? "var(--mx-bright)" : "var(--mx-dim)",
            }}
          >
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-3 text-xs shrink-0" style={{ borderColor: "var(--mx-error)", color: "var(--mx-error)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-[9px] uppercase tracking-widest shrink-0" style={{ color: "var(--mx-muted)" }}>
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2" style={{ background: "#0e2a0e", borderColor: "#39ff14" }} />
          chain block
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2" style={{ background: "rgba(239,68,68,0.18)", borderColor: "#ef4444" }} />
          non-chain
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2" style={{ borderColor: "#f59e0b" }} />
          selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          has user txs
        </span>
        <span className="ml-auto text-[8px]" style={{ color: "var(--mx-dim)" }}>
          scroll to zoom · drag to pan · click to inspect
        </span>
      </div>

      {/* Canvas + side panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="flex-1 block"
          style={{ cursor: stateRef.current.isDragging ? "grabbing" : "grab", minWidth: 0 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
        />

        {/* Detail panel */}
        {selected && (
          <div
            className="card shrink-0 flex flex-col gap-3 p-4 overflow-y-auto"
            style={{ width: 240, fontSize: "11px", color: "var(--mx-mid)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--mx-dim)" }}>
                Block Detail
              </span>
              <button
                onClick={() => { stateRef.current.selectedHash = null; setSelected(null); }}
                className="text-[10px]"
                style={{ color: "var(--mx-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Status badge */}
            <div className="text-center py-1 border text-[10px] font-bold tracking-widest"
                 style={{
                   borderColor: selected.is_chain_block ? "#39ff14" : "#ef4444",
                   color:       selected.is_chain_block ? "#39ff14" : "#ef4444",
                 }}>
              {selected.is_chain_block ? "⬡ CHAIN BLOCK" : "◇ NON-CHAIN"}
            </div>

            {[
              { label: "Hash",       value: shortHash(selected.hash, 10), mono: true },
              { label: "DAA Score",  value: selected.daa_score.toLocaleString('en-US') },
              { label: "Blue Score", value: selected.blue_score.toLocaleString('en-US') },
              { label: "TX Count",   value: selected.tx_count.toString() },
              { label: "Time",       value: formatTimestamp(selected.timestamp_ms) },
              { label: "Parents",    value: `${selected.parents.length}` },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--mx-dim)" }}>
                  {label}
                </span>
                <span style={{ fontFamily: mono ? "monospace" : undefined, fontSize: "10px" }}>
                  {value}
                </span>
              </div>
            ))}

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
      <div className="flex items-center gap-6 text-[9px] uppercase tracking-widest border-t pt-2 shrink-0"
           style={{ borderColor: "var(--mx-border)", color: "var(--mx-muted)" }}>
        <span><span style={{ color: "var(--mx-mid)" }}>{stats.total}</span> blocks</span>
        <span><span style={{ color: "#39ff14" }}>{stats.chain}</span> chain</span>
        <span><span style={{ color: "#ef4444" }}>{stats.ghost}</span> non-chain</span>
        <span><span style={{ color: "var(--mx-mid)" }}>{stats.cols}</span> daa cols</span>
        <span>tip <span style={{ color: "var(--mx-mid)" }}>{stats.tip.toLocaleString('en-US')}</span></span>
        {paused && <span style={{ color: "var(--mx-bright)" }}>⏸ PAUSED</span>}
      </div>
    </div>
  );
}
