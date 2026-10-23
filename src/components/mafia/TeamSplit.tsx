type Props = {
  town: number;
  mafia: number;
  label?: string;
};

const TOWN = "var(--town)";
const MAFIA = "var(--mafia,var(--accent))";

/**
 * توزيع الفرق على "طاولة": كل مقعد لاعب، والمافيا موزّعين بالتساوي
 * وسط الصالحين (مندسّين بينهم) بدل ما يكونوا كتلة واحدة.
 */
export default function TeamSplit({ town, mafia, label }: Props) {
  const total = Math.max(town + mafia, 1);
  const townPct = Math.round((town / total) * 100);
  const mafiaPct = 100 - townPct;

  // نوزّع مقاعد المافيا بالتساوي حوالين الطاولة
  const seats = Array.from({ length: total }, (_, i) => {
    const isMafia = Math.floor(((i + 1) * mafia) / total) > Math.floor((i * mafia) / total);
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    return { isMafia, x: 50 + 39 * Math.cos(angle), y: 50 + 39 * Math.sin(angle) };
  });
  const r = Math.min(5.5, ((Math.PI * 39) / total) * 0.6);

  return (
    <div
      role="group"
      aria-label={`${town} صالحين ضد ${mafia} مافيا`}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      {label && (
        <p className="mb-3 text-center text-[11px] text-[var(--text-1)] md:text-xs">{label}</p>
      )}

      <div className="flex items-center gap-4 md:gap-6">
        {/* الطاولة */}
        <div className="relative h-20 w-20 shrink-0 md:h-28 md:w-28" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <circle cx="50" cy="50" r="30" className="fill-white/[0.04] stroke-white/10" strokeWidth="1" />
            {seats.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={r} fill={s.isMafia ? MAFIA : TOWN} />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-xl font-extrabold tabular-nums md:text-3xl">{total}</span>
            <span className="mt-0.5 text-[9px] text-[var(--text-1)] md:text-[11px]">لاعب</span>
          </div>
        </div>

        {/* الأرقام */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Row color={TOWN} name="صالحين" count={town} pct={townPct} />
          <span className="h-px bg-white/10" />
          <Row color={MAFIA} name="مافيا" count={mafia} pct={mafiaPct} />
        </div>
      </div>
    </div>
  );
}

function Row({
  color,
  name,
  count,
  pct,
}: {
  color: string;
  name: string;
  count: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm font-bold md:text-base">{name}</span>
      <span
        className="text-3xl font-extrabold leading-none tabular-nums md:text-4xl"
        style={{ color }}
      >
        {count}
      </span>
      <span dir="ltr" className="w-10 text-left text-[11px] tabular-nums text-[var(--text-1)]">
        {pct}%
      </span>
    </div>
  );
}