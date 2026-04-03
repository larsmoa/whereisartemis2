interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="font-mono text-2xl font-bold text-white tabular-nums">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}
