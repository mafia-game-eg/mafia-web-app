"use client";

import { useEffect, useState } from "react";
import { Ban, Check } from "lucide-react";
import Avatar from "./Avatar";

/* =====================================================================
   PlayerPickList — قايمة اختيار اللاعبين (الليل / التصويت / التحقيق)
   نفس العقود بالظبط: choices / avatars / myChoice / disabled /
   forbiddenId / extraOption / onPick — من غير أي تغيير في المنطق.
   الجديد: الألوان بقت تتبع وضع التطبيق (ليت/درك) بنفس ميكانيزم صفحة
   الغرفة detectAppDark، وبألوان هوية اللعبة (بنفسجي + دهبي) بدل
   الألوان الهاردكود اللي كانت بتتكسر في الوضع الليت.
===================================================================== */

const PPL_CSS = `
.ppl-root {
  color-scheme: light;
  --ppl-text: #1d1d2e;
  --ppl-muted: #61617a;
  --ppl-line: rgba(25, 25, 55, 0.10);
  --ppl-item: rgba(25, 25, 55, 0.04);
  --ppl-item-hover: rgba(25, 25, 55, 0.07);
  --ppl-accent: #6d5ef2;
  --ppl-accent-2: #9d5ef2;
  --ppl-accent-soft: rgba(109, 94, 242, 0.12);
  --ppl-gold: #a97b1c;
  --ppl-gold-soft: rgba(169, 123, 28, 0.12);
}
.ppl-root[data-scheme="dark"] {
  color-scheme: dark;
  --ppl-text: #f3f3f7;
  --ppl-muted: #a4a4ba;
  --ppl-line: rgba(255, 255, 255, 0.10);
  --ppl-item: rgba(255, 255, 255, 0.05);
  --ppl-item-hover: rgba(255, 255, 255, 0.09);
  --ppl-accent: #6d5ef2;
  --ppl-accent-2: #9d5ef2;
  --ppl-accent-soft: rgba(109, 94, 242, 0.20);
  --ppl-gold: #d9a94f;
  --ppl-gold-soft: rgba(217, 169, 79, 0.14);
}

@keyframes ppl-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.ppl-up { animation: ppl-up .45s cubic-bezier(.22,.8,.32,1) both; }

.ppl-btn {
  background: var(--ppl-item);
  border: 1px solid var(--ppl-line);
  color: var(--ppl-text);
  transition: border-color .2s ease, background-color .2s ease, transform .15s ease, box-shadow .2s ease;
}
.ppl-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--ppl-accent) 45%, transparent);
  background: var(--ppl-item-hover);
  transform: translateY(-1px);
}
.ppl-btn:active:not(:disabled) { transform: scale(.96); }

.ppl-btn[data-selected="true"] {
  background: linear-gradient(to left, var(--ppl-accent-soft), transparent), var(--ppl-item);
  border-color: var(--ppl-accent);
  box-shadow: 0 10px 24px -14px color-mix(in srgb, var(--ppl-accent) 70%, transparent);
}

.ppl-btn[data-forbidden="true"] {
  border: 1px dashed var(--ppl-line);
  background: transparent;
  color: var(--ppl-muted);
  text-decoration: line-through;
  box-shadow: none;
}

.ppl-btn[data-extra="true"] {
  background: var(--ppl-gold-soft);
  border-color: color-mix(in srgb, var(--ppl-gold) 38%, transparent);
  color: var(--ppl-gold);
  font-weight: 800;
}
.ppl-btn[data-extra="true"]:hover:not(:disabled) {
  border-color: var(--ppl-gold);
  background: color-mix(in srgb, var(--ppl-gold) 18%, transparent);
}

.ppl-badge {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ppl-root *, .ppl-root *::before, .ppl-root *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;

/* --------------------- إحساس التطبيق بالوضع الغامق ---------------------
   نفس ميكانيزم صفحة الغرفة والبروفايل بالظبط (نسخة self-contained). */

function detectAppDark(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  const body = document.body;
  const hasDark = (el: HTMLElement | null): boolean =>
    !!el &&
    (el.classList.contains("dark") ||
      el.classList.contains("theme-dark") ||
      el.getAttribute("data-theme") === "dark" ||
      el.getAttribute("data-bs-theme") === "dark" ||
      el.getAttribute("data-color-mode") === "dark");
  const hasLight = (el: HTMLElement | null): boolean =>
    !!el &&
    (el.classList.contains("light") ||
      el.classList.contains("theme-light") ||
      el.getAttribute("data-theme") === "light" ||
      el.getAttribute("data-bs-theme") === "light");
  if (hasDark(root) || hasDark(body)) return true;
  if (hasLight(root) || hasLight(body)) return false;
  for (const el of [root, body]) {
    if (!el) continue;
    try {
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
      if (m) {
        const a = m[4] === undefined ? 1 : parseFloat(m[4]);
        if (a > 0.5) {
          const lum = (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
          return lum < 0.5;
        }
      }
    } catch {
      // تجاهل — الخلفية مش مقروءة
    }
  }
  return false;
}

function useAppTheme(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const apply = () => setDark(detectAppDark());
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-bs-theme", "data-color-mode"],
    });
    if (document.body) {
      mo.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme", "data-bs-theme"] });
    }
    return () => mo.disconnect();
  }, []);
  return dark;
}

/* =============================== الكومبوننت =============================== */

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
  const dark = useAppTheme();

  return (
    <div dir="rtl" className="ppl-root" data-scheme={dark ? "dark" : "light"}>
      <style>{PPL_CSS}</style>
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto scrollbar-thin p-1 sm:grid-cols-3">
        {extraOption && (
          <button
            key={extraOption.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(extraOption.id)}
            data-extra="true"
            data-selected={myChoice === extraOption.id}
            style={{ animationDelay: "0ms" }}
            className={`ppl-btn ppl-up rounded-2xl px-3 py-3 text-sm ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {myChoice === extraOption.id && <Check className="h-4 w-4" />}
              {extraOption.label}
            </span>
          </button>
        )}
        {choices.map((c, i) => {
          const forbidden = forbiddenId === c.id;
          const selected = myChoice === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled || forbidden}
              onClick={() => onPick(c.id)}
              title={forbidden ? "لا يمكن اختيار نفس الشخص ليلتين متتاليتين" : undefined}
              aria-pressed={selected}
              data-selected={selected}
              data-forbidden={forbidden}
              style={{ animationDelay: `${Math.min(i + 1, 10) * 45}ms` }}
              className={`ppl-btn ppl-up flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold ${
                disabled || forbidden ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <Avatar name={c.name} src={avatars?.[c.id] ?? null} size={32} />
              <span className="min-w-0 flex-1 truncate text-start">{c.name}</span>
              {forbidden ? (
                <Ban className="h-4 w-4 shrink-0 opacity-70" />
              ) : selected ? (
                <span className="ppl-badge" style={{ background: "var(--ppl-accent)" }}>
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}