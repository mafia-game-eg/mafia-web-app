export default function TeamSplit({
  town,
  mafia,
  label,
}: {
  town: number;
  mafia: number;
  label?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3" dir="rtl">
      {label && (
        <p className="mb-2 text-center text-[11px] tracking-wide text-[var(--text-1)]">{label}</p>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-baseline gap-1.5 font-bold text-[var(--town)]">
          <span className="text-xl leading-none">{town}</span>
          <span className="text-sm">صالحين</span>
        </span>
        <span className="text-[11px] font-medium text-[var(--text-1)]">ضد</span>
        <span className="flex items-baseline gap-1.5 font-bold text-[var(--mafia)]">
          <span className="text-xl leading-none">{mafia}</span>
          <span className="text-sm">مافيا</span>
        </span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="rounded-full bg-[var(--town)]" style={{ flex: town }} />
        <div className="rounded-full bg-[var(--mafia)]" style={{ flex: mafia }} />
      </div>
    </div>
  );
}