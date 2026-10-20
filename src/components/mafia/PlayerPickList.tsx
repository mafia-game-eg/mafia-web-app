"use client";

import Avatar from "./Avatar";

export default function PlayerPickList({
  choices,
  avatars,
  myChoice,
  disabled,
  forbiddenId,
  extraOption,
  onPick,
}: {
  choices: { id: string; name: string }[];
  avatars?: Record<string, string | null | undefined>;
  myChoice?: string;
  disabled?: boolean;
  forbiddenId?: string | null;
  extraOption?: { id: string; label: string };
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto scrollbar-thin p-1 sm:grid-cols-3">
      {extraOption && (
        <button
          key={extraOption.id}
          disabled={disabled}
          onClick={() => onPick(extraOption.id)}
          className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${
            myChoice === extraOption.id
              ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)]"
              : "border-white/10 bg-white/5 text-[var(--text-0)] hover:border-white/30"
          } ${disabled ? "cursor-not-allowed opacity-50" : "active:scale-95"}`}
        >
          {extraOption.label}
        </button>
      )}
      {choices.map((c) => {
        const forbidden = forbiddenId === c.id;
        const selected = myChoice === c.id;
        return (
          <button
            key={c.id}
            disabled={disabled || forbidden}
            onClick={() => onPick(c.id)}
            title={forbidden ? "لا يمكن اختيار نفس الشخص ليلتين متتاليتين" : undefined}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white"
                : forbidden
                  ? "border-white/5 bg-white/[0.02] text-[var(--text-1)] line-through"
                  : "border-white/10 bg-white/5 text-[var(--text-0)] hover:border-white/30"
            } ${disabled || forbidden ? "cursor-not-allowed opacity-60" : "active:scale-95"}`}
          >
            <Avatar name={c.name} src={avatars?.[c.id] ?? null} size={32} />
            <span className="min-w-0 truncate">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}