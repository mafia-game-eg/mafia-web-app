"use client";

import { useState } from "react";

export default function RoleCard({
  icon,
  title,
  description,
  team,
  mafiaTeammates,
}: {
  icon: string;
  title: string;
  description: string;
  team: "mafia" | "town";
  mafiaTeammates?: { id: string; name: string }[];
}) {
  const [held, setHeld] = useState(false);

  return (
    <div className="card-3d mx-auto h-72 w-56 select-none" dir="rtl">
      <div
        className={`card-3d-inner relative h-full w-full cursor-pointer rounded-3xl ${held ? "flipped" : ""}`}
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
      >
        {/* back of card (shown when not held) */}
        <div
          className="card-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-br from-[#1a1428] to-[#0c0a14] shadow-2xl"
        >
          <div className="text-5xl">🎭</div>
          <p className="px-4 text-center text-sm text-[var(--text-1)]">
            اضغط مطولًا لترى دورك
          </p>
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[var(--gold)]/20" />
        </div>

        {/* front of card (shown when held/flipped) */}
        <div
          className={`card-face back absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl border p-5 text-center shadow-2xl ${
            team === "mafia"
              ? "border-red-500/50 bg-gradient-to-br from-[#2a0f16] to-[#140509]"
              : "border-teal-400/40 bg-gradient-to-br from-[#0f2522] to-[#06100f]"
          }`}
        >
          <div className="text-6xl">{icon}</div>
          <div
            className={`text-xl font-extrabold ${team === "mafia" ? "text-red-400" : "text-teal-300"}`}
          >
            {title}
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-1)]">{description}</p>
          {mafiaTeammates && mafiaTeammates.length > 0 && (
            <div className="mt-1 w-full rounded-xl bg-black/30 p-2">
              <div className="mb-1 text-[11px] text-red-300">زملاؤك في المافيا:</div>
              <div className="flex flex-wrap justify-center gap-1">
                {mafiaTeammates.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-200"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
