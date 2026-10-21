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
    <div className="px-1" dir="rtl">
      {label && (
        <p className="mb-2.5 text-center text-[11px] font-medium tracking-wide text-[var(--text-1)]">
          {label}
        </p>
      )}
      <div className="mb-2 flex items-end justify-between">
        <span className="flex items-baseline gap-1.5 font-bold text-[var(--town)]">
          <span className="text-2xl leading-none">{town}</span>
          <span className="text-sm">صالحين</span>
        </span>
        <span className="pb-0.5 text-[11px] text-[var(--text-1)]">ضد</span>
        <span className="flex items-baseline gap-1.5 font-bold text-[var(--mafia)]">
          <span className="text-2xl leading-none">{mafia}</span>
          <span className="text-sm">مافيا</span>
        </span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="rounded-full bg-[var(--town)]" style={{ flex: town }} />
        <div className="rounded-full bg-[var(--mafia)]" style={{ flex: mafia }} />
      </div>
    </div>
  );
}