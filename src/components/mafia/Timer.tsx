"use client";

export default function Timer({
  secondsLeft,
  totalSeconds,
  label,
}: {
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
}) {
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;
  const danger = secondsLeft <= 5;
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-xs text-[var(--text-1)]">{label}</div>}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
            danger
              ? "border-red-500 text-red-400 animate-pulse-glow"
              : "border-[var(--gold)]/50 text-[var(--gold)]"
          }`}
        >
          {Math.ceil(secondsLeft)}
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              danger ? "bg-red-500" : "bg-[var(--gold)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
