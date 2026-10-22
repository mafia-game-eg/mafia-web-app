export default function TeamSplit({
  town,
  mafia,
  label,
}: {
  town: number;
  mafia: number;
  label?: string;
}) {
  const total = Math.max(town + mafia, 1);
  const townPct = Math.round((town / total) * 100);
  const mafiaPct = 100 - townPct;

  return (
    <div className="select-none px-1" dir="rtl">
      <style>{`
        @keyframes ts-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .ts-seg { animation: ts-grow .9s cubic-bezier(.22,1,.36,1) .15s both; }
        @media (prefers-reduced-motion: reduce) { .ts-seg { animation: none; } }
      `}</style>

      {label && (
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-l from-white/25 to-transparent" />
          <span className="text-[11px] font-medium tracking-wide text-[var(--text-1)]">
            {label}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
        </div>
      )}

      <div className="mb-2.5 flex items-end justify-between">
        <span className="flex items-baseline gap-1.5 font-bold text-[var(--town)]">
          <span
            className="text-[32px] font-extrabold leading-none tabular-nums"
            style={{
              textShadow: "0 0 18px color-mix(in srgb, var(--town) 40%, transparent)",
            }}
          >
            {town}
          </span>
          <span className="text-sm">صالحين</span>
        </span>

        <span className="mb-0.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--text-1)]">
          ضد
        </span>

        <span className="flex items-baseline gap-1.5 font-bold text-[var(--mafia)]">
          <span
            className="text-[32px] font-extrabold leading-none tabular-nums"
            style={{
              textShadow: "0 0 18px color-mix(in srgb, var(--mafia) 40%, transparent)",
            }}
          >
            {mafia}
          </span>
          <span className="text-sm">مافيا</span>
        </span>
      </div>

      <div className="flex h-2 gap-1">
        <div
          className="ts-seg rounded-full"
          style={{
            flex: town,
            transformOrigin: "right",
            background:
              "linear-gradient(270deg, var(--town), color-mix(in srgb, var(--town) 70%, black))",
            boxShadow: "0 0 14px color-mix(in srgb, var(--town) 40%, transparent)",
          }}
        />
        <div
          className="ts-seg rounded-full"
          style={{
            flex: mafia,
            transformOrigin: "left",
            background:
              "linear-gradient(90deg, var(--mafia), color-mix(in srgb, var(--mafia) 70%, black))",
            boxShadow: "0 0 14px color-mix(in srgb, var(--mafia) 40%, transparent)",
          }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-semibold tabular-nums text-[var(--text-1)]">
        <span>{townPct}%</span>
        <span>{mafiaPct}%</span>
      </div>
    </div>
  );
}