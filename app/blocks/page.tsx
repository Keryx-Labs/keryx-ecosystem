import { api, Block } from "@/lib/api";
import LiveBlocks from "@/components/LiveBlocks";

export const revalidate = 0;

export default async function BlocksPage() {
  let blocks: Block[] = [];
  try { blocks = await api.blocks(50); } catch {}

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--mx-bright)" }}>
        Blocks
      </h1>

      <div className="flex items-center gap-4 px-3 text-[9px] uppercase tracking-widest border-b pb-2"
           style={{ color: "var(--mx-muted)", borderColor: "var(--mx-border)" }}>
        <span className="w-24 shrink-0">DAA Score</span>
        <span className="flex-1">Hash</span>
        <span className="w-16 text-right shrink-0">Txs</span>
        <span className="w-16 text-right shrink-0">Type</span>
        <span className="w-20 text-right shrink-0">Age</span>
      </div>

      {blocks.length > 0 ? (
        <LiveBlocks initial={blocks} />
      ) : (
        <div className="card p-8 text-center text-xs" style={{ color: "var(--mx-muted)" }}>
          No blocks indexed yet.
        </div>
      )}
    </div>
  );
}
