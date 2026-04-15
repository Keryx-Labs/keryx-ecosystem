interface StatCardProps {
  label: string;
  value: string | number;
  accent?: "cyan" | "green" | "purple";
  sub?: string;
}

const colors = {
  cyan:   "text-[#00e5ff]",
  green:  "text-[#00ff88]",
  purple: "text-[#7b2fff]",
};

export default function StatCard({ label, value, accent = "cyan", sub }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-xs text-[#4a6080] uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold ${colors[accent]}`}>{value}</span>
      {sub && <span className="text-xs text-[#4a6080]">{sub}</span>}
    </div>
  );
}
