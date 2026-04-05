interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}

export function StatCard({ label, value, sub, children }: StatCardProps): React.JSX.Element {
  return (
    <div className="relative overflow-hidden flex h-full flex-col gap-0.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm sm:gap-1 sm:px-5 sm:py-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
        {label}
      </span>
      <span className="font-mono text-lg font-bold text-white tabular-nums sm:text-2xl">
        {value}
      </span>
      {sub && <span className="hidden text-xs text-zinc-500 sm:block">{sub}</span>}
      {children}
    </div>
  );
}
