"use client";

// ✏️ تم تطوير الصفحة: نظام ألوان بيتبع وضع التطبيق (ليت/درك) تلقائيًا بدل الوضع الدرك الثابت،
// + سكورمة كاملة على الفون والتابلت والديسكتوب. كل منطق اللعبة والجلسة زي ما هو بالظبط.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleHelp,
  Copy,
  Crown,
  Eye,
  Ghost,
  LogOut,
  Moon,
  RefreshCw,
  Share2,
  Skull,
  Sun,
  Trophy,
  UserMinus,
  UserPlus,
  VenetianMask,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { clearSession, loadSession, saveSession, type SessionInfo } from "@/lib/client/storage";
import { isMuted, setMuted, soundError, soundPhaseChange, soundSuccess, vibrate } from "@/lib/client/sound";
import type { PlayerView } from "@/lib/mafia/view";
import RoleCard from "@/components/mafia/RoleCard";
import Timer from "@/components/mafia/Timer";
import PlayerPickList from "@/components/mafia/PlayerPickList";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Avatar from "@/components/mafia/Avatar";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

const POLL_MS = 1400;
const MIN_TO_START = 4; // الحد الأدنى لبدء اللعبة
const WEAK_AFTER = 2; // بعد 2 فشل متتالي (~3 ثواني) نعرض تحذير خفيف بس
const DOWN_AFTER = 6; // بعد 6 فشل (~9 ثواني) نعرض أوفرلاي إعادة الاتصال — من غير طرد

const JOIN_ERROR_MSG = "حصلت مشكلة في الاتصال. اتأكد من النت وجرّب تاني.";

// ✏️ اتغيرت: الفوكس بقى كلاس داخلي بيتبع ألوان الثيم الحالي بدل ring أبيض ثابت
const focusRing = "sf-focus";

/* ✏️ جديد — نظام ألوان الصفحة:
   الوضع الفاتح هو الأساس (زي باقي صفحات التطبيق)، وكل الألوان متعرّفة كمتغيرات
   محلية على نطاق الصفحة بس (.mf-page). لو التطبيق شغال في الوضع الغامق، الصفحة
   بتحس بيه أوتوماتيك (كلاس/خاصية على html أو body أو قياس إضاءة الخلفية) وتقلب
   قيم المتغيرات — من غير ما نلمس ثيم باقي صفحات التطبيق خالص. */
const PAGE_STYLE = `
  .mf-page {
    color-scheme: light;
    --sf-text: #1d1d2e;
    --sf-muted: #61617a;
    --sf-card: #ffffff;
    --sf-line: rgba(25, 25, 55, 0.10);
    --sf-soft: rgba(25, 25, 55, 0.05);
    --sf-soft-2: rgba(25, 25, 55, 0.09);
    --sf-field: #ffffff;
    --sf-ring: rgba(109, 94, 242, 0.55);
    --sf-shadow: 0 12px 32px -14px rgba(25, 25, 60, 0.22);
    --sf-ok: #0e8a5f;
    --sf-ok-bg: rgba(16, 185, 129, 0.12);
    --sf-bad: #c22a2a;
    --sf-bad-bg: rgba(239, 68, 68, 0.10);
    --sf-warn: #9a5b06;
    --sf-warn-bg: rgba(245, 158, 11, 0.13);
    --sf-warn-line: rgba(217, 119, 6, 0.32);
    --sf-online: #10b981;
    --sf-offline: rgba(25, 25, 55, 0.28);
    --sf-track: rgba(25, 25, 55, 0.08);
    --sf-mark: rgba(25, 25, 55, 0.055);
    --sf-overlay: rgba(22, 22, 46, 0.55);
    color: var(--sf-text);
  }
  .mf-page[data-scheme="dark"] {
    color-scheme: dark;
    --sf-text: #f3f3f7;
    --sf-muted: #a4a4ba;
    --sf-card: #16161f;
    --sf-line: rgba(255, 255, 255, 0.10);
    --sf-soft: rgba(255, 255, 255, 0.05);
    --sf-soft-2: rgba(255, 255, 255, 0.10);
    --sf-field: #0e0e16;
    --sf-ring: rgba(165, 180, 252, 0.65);
    --sf-shadow: 0 12px 32px -14px rgba(0, 0, 0, 0.6);
    --sf-ok: #34d399;
    --sf-ok-bg: rgba(52, 211, 153, 0.12);
    --sf-bad: #f87171;
    --sf-bad-bg: rgba(248, 113, 113, 0.12);
    --sf-warn: #fcd34d;
    --sf-warn-bg: rgba(251, 191, 36, 0.10);
    --sf-warn-line: rgba(251, 191, 36, 0.30);
    --sf-online: #34d399;
    --sf-offline: rgba(255, 255, 255, 0.30);
    --sf-track: rgba(255, 255, 255, 0.10);
    --sf-mark: rgba(255, 255, 255, 0.05);
    --sf-overlay: rgba(4, 4, 10, 0.72);
  }
  .mf-page .sf-muted { color: var(--sf-muted); }
  .mf-page .sf-ok-text { color: var(--sf-ok); }
  .mf-page .sf-bad-text { color: var(--sf-bad); }
  .mf-page .sf-warn-text { color: var(--sf-warn); }
  .mf-page .sf-gold { color: var(--gold, #a97b1c); }
  .mf-page .sf-card { background: var(--sf-card); border: 1px solid var(--sf-line); border-radius: 1.5rem; box-shadow: var(--sf-shadow); }
  .mf-page .sf-card-sm { border-radius: 1.125rem; }
  .mf-page .sf-panel { background: var(--sf-soft); border: 1px solid var(--sf-line); border-radius: 1rem; }
  .mf-page .sf-item { background: var(--sf-soft); border: 1px solid var(--sf-line); border-radius: 1rem; }
  .mf-page .sf-slot-empty { border: 1.5px dashed var(--sf-line); background: transparent; }
  .mf-page .sf-circle-dashed { border: 1.5px dashed var(--sf-line); }
  .mf-page .sf-icon-btn { display: flex; align-items: center; justify-content: center; background: var(--sf-soft); border: 1px solid var(--sf-line); color: var(--sf-muted); transition: background-color 0.2s ease, color 0.2s ease, transform 0.15s ease; }
  .mf-page .sf-icon-btn:hover { background: var(--sf-soft-2); color: var(--sf-text); }
  .mf-page .sf-icon-btn:active { transform: scale(0.9); }
  .mf-page .sf-btn-primary { background-image: linear-gradient(to left, var(--accent, #6d5ef2), var(--accent-2, #9d5ef2)); color: #fff; box-shadow: 0 14px 30px -12px var(--accent, #6d5ef2); transition: filter 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease; }
  .mf-page .sf-btn-primary:hover { filter: brightness(1.07); }
  .mf-page .sf-btn-primary:active { transform: scale(0.98); }
  .mf-page .sf-btn-primary:disabled { filter: none; opacity: 0.45; box-shadow: none; pointer-events: none; }
  .mf-page .sf-btn-ghost { background: var(--sf-soft); border: 1px solid var(--sf-line); color: var(--sf-text); transition: background-color 0.2s ease, transform 0.15s ease; }
  .mf-page .sf-btn-ghost:hover { background: var(--sf-soft-2); }
  .mf-page .sf-btn-ghost:active { transform: scale(0.97); }
  .mf-page .sf-btn-ok { background: var(--sf-ok-bg); border: 1px solid color-mix(in srgb, var(--sf-ok) 35%, transparent); color: var(--sf-ok); }
  .mf-page .sf-btn-danger { background: var(--sf-bad-bg); color: var(--sf-bad); transition: background-color 0.2s ease, transform 0.15s ease; }
  .mf-page .sf-btn-danger:hover { background: color-mix(in srgb, var(--sf-bad) 22%, transparent); }
  .mf-page .sf-btn-danger:active { transform: scale(0.9); }
  .mf-page .sf-input { width: 100%; background: var(--sf-field); border: 1px solid var(--sf-line); color: var(--sf-text); transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .mf-page .sf-input::placeholder { color: var(--sf-muted); }
  .mf-page .sf-input:focus { outline: none; border-color: var(--accent, #6d5ef2); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #6d5ef2) 20%, transparent); }
  .mf-page .sf-chip { background: var(--sf-soft); border: 1px solid var(--sf-line); color: var(--sf-muted); }
  .mf-page .sf-host-badge { background: color-mix(in srgb, var(--gold, #a97b1c) 16%, transparent); color: var(--gold, #a97b1c); }
  .mf-page .sf-tile { background: var(--sf-soft); border: 1px solid color-mix(in srgb, var(--gold, #a97b1c) 30%, transparent); color: var(--gold, #a97b1c); box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--gold, #a97b1c) 16%, transparent); }
  .mf-page .sf-code-card { border-radius: 1.5rem; padding: 1px; background: linear-gradient(180deg, color-mix(in srgb, var(--gold, #a97b1c) 45%, transparent) 0%, var(--sf-line) 58%, transparent 100%); }
  .mf-page .sf-code-card-inner { border-radius: calc(1.5rem - 1px); background: var(--sf-card); }
  .mf-page .sf-mark { color: var(--sf-mark); }
  .mf-page .sf-warn-banner { background: var(--sf-warn-bg); border: 1px solid var(--sf-warn-line); color: var(--sf-warn); }
  .mf-page .sf-bad-banner { background: var(--sf-bad-bg); color: var(--sf-bad); }
  .mf-page .sf-danger-panel { background: var(--sf-bad-bg); border: 1px solid color-mix(in srgb, var(--sf-bad) 25%, transparent); border-radius: 1rem; }
  .mf-page .sf-dot { width: 6px; height: 6px; border-radius: 999px; }
  .mf-page .sf-dot.on { background: var(--sf-online); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sf-online) 22%, transparent); }
  .mf-page .sf-dot.off { background: var(--sf-offline); }
  .mf-page .sf-progress { height: 10px; border-radius: 999px; background: var(--sf-track); overflow: hidden; }
  .mf-page .sf-progress-fill { height: 100%; border-radius: 999px; background-image: linear-gradient(to left, var(--accent, #6d5ef2), var(--accent-2, #9d5ef2)); transition: width 0.5s ease; }
  .mf-page .sf-progress-fill.ready { background-image: linear-gradient(to left, #10b981, #5eead4); box-shadow: 0 0 14px rgba(52, 211, 153, 0.55); }
  /* كارت الليل: بانل أجواء ليلية مقصود — شكله ثابت في الوضعين زي شاشة الليل في ألعاب الجماعة */
  .mf-page .sf-night { background: linear-gradient(180deg, #191537 0%, #0d0a21 100%); border: 1px solid rgba(129, 140, 248, 0.22); color: #e7ebff; border-radius: 1.5rem; box-shadow: 0 14px 36px -16px rgba(67, 56, 202, 0.6); }
  .mf-page .sf-night-btn { background: rgba(255, 255, 255, 0.10); color: #fff; transition: background-color 0.2s ease, transform 0.15s ease; }
  .mf-page .sf-night-btn:hover { background: rgba(255, 255, 255, 0.17); }
  .mf-page .sf-night-btn:active { transform: scale(0.95); }
  .mf-page .sf-overlay { background: var(--sf-overlay); backdrop-filter: blur(4px); }
  .mf-page .sf-focus:focus-visible { outline: 2px solid var(--sf-ring); outline-offset: 2px; }
  .mf-page .sf-scroll { scrollbar-width: thin; scrollbar-color: var(--sf-line) transparent; }
  .mf-page .sf-scroll::-webkit-scrollbar { width: 6px; }
  .mf-page .sf-scroll::-webkit-scrollbar-thumb { background: var(--sf-line); border-radius: 999px; }
  @keyframes mf-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .mf-page .mf-float { animation: mf-float 3s ease-in-out infinite; }
  .mf-stagger { animation-fill-mode: both; }
  @media (prefers-reduced-motion: reduce) {
    .mf-page *, .mf-page *::before, .mf-page *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

type ConnState = "ok" | "weak" | "down";

type RunAction = (fn: () => Promise<{ ok: boolean; error?: string; view?: PlayerView }>) => Promise<void>;

/* ---------- ✏️ جديد: قراءة وضع التطبيق الحالي (فاتح/غامق) ---------- */

// بيقرأ الثيم من نفس الأماكن اللي التطبيق بيستخدمها: كلاس dark/light أو
// data-theme على html أو body، ولو مفيش إشارة واضحة بيقيس إضاءة خلفية الصفحة الفعلية.
// الافتراضي دايمًا فاتح — عشان الصفحة تتمشى مع الوضع الليت بتاع التطبيق.
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

// Hook بيراقب تغيير الثيم لحظيًا: لو المستخدم بدّل وضع التطبيق وهو واقف في الصفحة دي، تتبدل معاه
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

/* ---------- خلفية بتتغير مع طور اللعبة — نسخة فاتحة ونسخة غامقة ---------- */

function ambienceBg(phase: string, dark: boolean): string {
  let glow: string;
  if (dark) {
    glow = "radial-gradient(900px 480px at 50% -8%, rgba(56,189,248,0.07), transparent 65%)";
    if (phase === "night") {
      glow = "radial-gradient(900px 480px at 50% -8%, rgba(99,102,241,0.18), transparent 65%)";
    } else if (phase === "morning" || phase === "role_reveal") {
      glow = "radial-gradient(900px 480px at 50% -8%, rgba(250,204,21,0.10), transparent 65%)";
    } else if (phase === "game_over") {
      glow = "radial-gradient(900px 480px at 50% -8%, rgba(168,85,247,0.12), transparent 65%)";
    } else if (phase === "lobby") {
      glow = "radial-gradient(900px 480px at 50% -8%, rgba(250,204,21,0.08), transparent 65%)";
    }
    return `${glow}, linear-gradient(180deg, #0a0a10 0%, #070709 100%)`;
  }
  glow = "radial-gradient(900px 480px at 50% -8%, rgba(56,189,248,0.08), transparent 65%)";
  if (phase === "night") {
    glow = "radial-gradient(900px 480px at 50% -8%, rgba(99,102,241,0.14), transparent 65%)";
  } else if (phase === "morning" || phase === "role_reveal") {
    glow = "radial-gradient(900px 480px at 50% -8%, rgba(245,158,11,0.15), transparent 65%)";
  } else if (phase === "game_over") {
    glow = "radial-gradient(900px 480px at 50% -8%, rgba(168,85,247,0.10), transparent 65%)";
  } else if (phase === "lobby") {
    glow = "radial-gradient(900px 480px at 50% -8%, rgba(234,179,8,0.12), transparent 65%)";
  }
  return `${glow}, linear-gradient(180deg, #f8f8fc 0%, #eef0f7 100%)`;
}

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [view, setView] = useState<PlayerView | null>(null);
  const [actionError, setActionError] = useState("");
  const [muted, setMutedState] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [tick, setTick] = useState(0);
  const [conn, setConn] = useState<ConnState>("ok"); // حالة الاتصال بدل شاشة الطرد
  const dark = useAppTheme(); // ✏️ جديد: الصفحة بتتبع وضع التطبيق (ليت/درك)
  const clockOffsetRef = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);
  const failRef = useRef(0);
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    setMutedState(isMuted());
    const s = loadSession(roomCode);
    if (s) setSession(s);
    else setJoinName(loadProfile().name);
  }, [roomCode]);

  // smooth timer re-render
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);

  // مفيش شاشة خطأ بتمسح اللعبة — حالة الاتصال بتتحسن لوحدها أول ما السيرفر يرد.
  // الجلسة عمرها ما بتتمسح أوتوماتيك، والخروج بقا قرار اللاعب بس.
  const poll = useCallback(async () => {
    if (!session) return;
    let res: Awaited<ReturnType<typeof api.state>>;
    try {
      res = await api.state(roomCode, session.playerId, session.token);
    } catch {
      // لو الـ fetch نفسه رمى خطأ (نت فصل لحظيًا) نعدّه فشل عادي — الاتصال بيرجع لوحده
      failRef.current += 1;
      const fails = failRef.current;
      setConn(fails >= DOWN_AFTER ? "down" : fails >= WEAK_AFTER ? "weak" : "ok");
      return;
    }
    if (!res.ok) {
      failRef.current += 1;
      const fails = failRef.current;
      setConn(fails >= DOWN_AFTER ? "down" : fails >= WEAK_AFTER ? "weak" : "ok");
      return;
    }
    failRef.current = 0;
    setConn("ok");
    if (res.view) {
      clockOffsetRef.current = res.view.serverNow - Date.now();
      setView(res.view);
    }
  }, [roomCode, session]);

  useEffect(() => {
    if (!session) return;
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [session, poll]);

  // phase change feedback
  useEffect(() => {
    if (!view) return;
    const key = `${view.room.phase}:${view.room.nightSubPhase ?? ""}:${view.room.daySubPhase ?? ""}`;
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== key) {
      vibrate(80);
      soundPhaseChange();
    }
    prevPhaseRef.current = key;
    setTextInput("");
  }, [view?.room.phase, view?.room.nightSubPhase, view?.room.daySubPhase]);

  // رسالة الخطأ المؤقتة بتختفي لوحدها بعد 4 ثواني
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  async function handleJoin() {
    setJoinError("");
    if (!joinName.trim()) {
      setJoinError("اكتب اسمك أولًا.");
      return;
    }
    setJoinLoading(true);
    try {
      const avatar = await shrinkAvatar(loadProfile().avatar);
      const res = await api.join({ roomCode, playerName: joinName.trim(), avatar });
      if (!res.ok) {
        setJoinError(res.error);
        return;
      }
      const s: SessionInfo = {
        roomCode,
        playerId: res.playerId,
        token: res.token,
        name: joinName.trim(),
      };
      saveSession(s);
      vibrate(30);
      soundSuccess();
      setSession(s);
    } catch {
      setJoinError(JOIN_ERROR_MSG);
    } finally {
      setJoinLoading(false);
    }
  }

  function secondsLeft(): number {
    if (!view?.room.phaseEndsAt) return 0;
    void tick;
    const now = Date.now() + clockOffsetRef.current;
    return Math.max(0, (view.room.phaseEndsAt - now) / 1000);
  }

  function totalSecondsFor(): number {
    if (!view) return 1;
    switch (view.room.phase) {
      case "night":
        return 15;
      case "morning":
        return 8;
      case "day_questions":
        return view.room.daySubPhase === "question" ? 30 : 30;
      case "day_accusation":
        return 30;
      case "voting":
        return 30;
      case "vote_reveal":
        return 10;
      default:
        return 1;
    }
  }

  async function runAction<T>(fn: () => Promise<{ ok: boolean; error?: string; view?: PlayerView }>) {
    setActionError("");
    const res = await fn();
    if (!res.ok) {
      setActionError(res.error ?? "حدث خطأ.");
      soundError();
      vibrate([40, 40, 40]);
      return;
    }
    soundSuccess();
    if (res.view) setView(res.view);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    vibrate(15);
  }

  async function copyCode() {
    vibrate(15);
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // ignore
    }
  }

  async function shareCode() {
    vibrate(15);
    const url = `${window.location.origin}/room/${roomCode}`;
    const shareData = {
      title: "انضم للعبة المافيا",
      text: `انضم إلى غرفة المافيا بالكود ${roomCode}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // ignore cancel
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
    }
  }

  async function leaveToHome() {
    const inProgress = !!view && view.room.phase !== "lobby" && view.room.phase !== "game_over";
    if (inProgress && !window.confirm("اللعبة لسه شغالة! متأكد إنك عايز تخرج؟")) return;
    if (session) {
      await api.leave(roomCode, session.playerId, session.token).catch(() => {});
    }
    clearSession(roomCode);
    router.push("/");
  }

  // خروج من غير تأكيد (مستخدم في شاشة إعادة الاتصال لما الاتصال يكون واقف فعلًا)
  async function forceLeave() {
    if (session) {
      await api.leave(roomCode, session.playerId, session.token).catch(() => {});
    }
    clearSession(roomCode);
    router.push("/");
  }

  // تصفير الجلسة والرجوع لكارت الانضمام في نفس الصفحة — من غير توجيه لأي حتة
  function rejoinFromScratch() {
    clearSession(roomCode);
    setSession(null);
    setView(null);
    setConn("ok");
    failRef.current = 0;
    setJoinName(loadProfile().name || joinName);
  }

  function retryNow() {
    vibrate(15);
    poll();
  }

  // ---------- render states ----------

  if (!session) {
    return (
      <Screen dark={dark}>
        <style>{PAGE_STYLE}</style>
        {/* كارت الانضمام */}
        <div className="mf-stagger w-full max-w-sm animate-fade-in-up">
          <div className="sf-card p-6 text-center sm:p-7">
            <span className="sf-panel mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
              <VenetianMask className="sf-gold h-6 w-6" strokeWidth={1.5} />
            </span>
            <h1 className="sf-gold mb-1 text-lg font-bold">الانضمام للغرفة</h1>
            <p className="sf-muted mb-4 text-sm">
              كود الغرفة:{" "}
              <span dir="ltr" className="font-mono font-bold tracking-widest">
                {roomCode}
              </span>
            </p>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="اكتب اسمك هنا..."
              className={`sf-input sf-focus mb-3 rounded-xl px-4 py-3 text-center ${focusRing}`}
            />
            <button
              type="button"
              disabled={joinLoading}
              onClick={handleJoin}
              className="sf-btn-primary sf-focus w-full rounded-2xl px-4 py-3 font-bold"
            >
              {joinLoading ? "جارِ الدخول..." : "انضمام"}
            </button>
            {joinError && (
              <p role="alert" className="sf-bad-text mt-3 text-sm">
                {joinError}
              </p>
            )}
          </div>
        </div>
      </Screen>
    );
  }

  if (!view) {
    return (
      <Screen dark={dark}>
        <style>{PAGE_STYLE}</style>
        {conn === "down" ? (
          <ReconnectCard roomCode={roomCode} onRetry={retryNow} onRejoin={rejoinFromScratch} onLeave={forceLeave} />
        ) : (
          <p className="sf-muted animate-pulse text-sm">جارِ الاتصال بالغرفة...</p>
        )}
      </Screen>
    );
  }

  const { room, me } = view;

  return (
    /* ✏️ اتظبطت المقاسات: فون عمود واحد، تابلت كروت أوسع، وديسكتوب اللوبي بيبقى عمودين.
       كمان اللوبي أعرض (5xl) عشان يستفيد من مساحة الديسكتوب، وباقي أطوار اللعب متوسطة مريحة (2xl). */
    <main
      dir="rtl"
      data-scheme={dark ? "dark" : "light"}
      className={`mf-page relative mx-auto flex min-h-dvh w-full flex-col px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-10 sm:pt-5 ${
        room.phase === "lobby" ? "max-w-[640px] lg:max-w-5xl" : "max-w-2xl"
      }`}
      style={{ background: ambienceBg(room.phase, dark) }}
    >
      <style>{PAGE_STYLE}</style>

      <Header
        roomCode={roomCode}
        muted={muted}
        onToggleMute={toggleMute}
        onHowTo={() => setShowHowTo(true)}
        onLeave={leaveToHome}
        isHost={me.isHost}
        onOpenRole={me.roleInfo && room.phase !== "lobby" ? () => setShowRoleModal(true) : undefined}
      />

      {/* شارة الطور الحالي — في اللوبي مكانها عنوان الصفحة الكبير جوه اللوبي نفسه */}
      {room.phase !== "lobby" && <PhaseChip view={view} />}

      {/* تحذير اتصال خفيف — من غير ما نقطع اللعبة */}
      {conn === "weak" && (
        <div
          role="status"
          aria-live="polite"
          className="sf-warn-banner mb-3 flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-center text-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          الاتصال ضعيف — لو زرار مش مستجيب استنى ثواني وهيرجع لوحده
        </div>
      )}

      {!me.alive && room.phase !== "lobby" && room.phase !== "role_reveal" && room.phase !== "game_over" && (
        <div className="sf-panel mb-3 px-4 py-2 text-center text-sm sf-muted">
          <Ghost className="ml-1.5 inline h-4 w-4 align-text-bottom" />
          لقد خرجت من اللعبة وأصبحت متفرجًا، يمكنك متابعة الأحداث فقط.
        </div>
      )}

      {actionError && (
        <div role="alert" className="sf-bad-banner mb-3 rounded-2xl px-4 py-2 text-center text-sm font-semibold">
          {actionError}
        </div>
      )}

      {room.phase === "lobby" && (
        <LobbyView view={view} session={session} onCopy={copyCode} onShare={shareCode} runAction={runAction} />
      )}

      {room.phase === "role_reveal" && (
        <RoleRevealView view={view} session={session} runAction={runAction} secondsLeft={secondsLeft()} />
      )}

      {room.phase === "night" && (
        <NightView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          onOpenRole={() => setShowRoleModal(true)}
        />
      )}

      {room.phase === "morning" && <MorningView view={view} secondsLeft={secondsLeft()} total={totalSecondsFor()} />}

      {room.phase === "day_questions" && (
        <DayQuestionsView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          textInput={textInput}
          setTextInput={setTextInput}
        />
      )}

      {room.phase === "day_accusation" && (
        <AccusationView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          textInput={textInput}
          setTextInput={setTextInput}
        />
      )}

      {room.phase === "voting" && (
        <VotingView view={view} session={session} runAction={runAction} secondsLeft={secondsLeft()} total={totalSecondsFor()} />
      )}

      {room.phase === "vote_reveal" && (
        <VoteRevealView view={view} secondsLeft={secondsLeft()} total={totalSecondsFor()} />
      )}

      {room.phase === "game_over" && <GameOverView view={view} session={session} runAction={runAction} />}

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      {showRoleModal && me.roleInfo && (
        <div
          className="sf-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          onClick={() => setShowRoleModal(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <RoleCard
              icon={me.roleInfo.icon}
              title={me.roleInfo.title}
              description={me.roleInfo.description}
              team={me.roleInfo.team}
              mafiaTeammates={me.mafiaTeammates}
            />
            {/* نتائج المحقق: بتتعرض هنا */}
            {me.role === "detective" && (
              <div className="sf-panel mx-auto mt-4 w-full max-w-xs p-3 text-right text-sm">
                <p className="sf-gold mb-2 font-bold">🕵️ نتائج تحقيقاتك</p>
                {me.investigations.length === 0 ? (
                  <p className="sf-muted text-xs">لم تحقق مع أحد بعد.</p>
                ) : (
                  <ul className="space-y-1">
                    {me.investigations.map((inv) => (
                      <li key={`${inv.night}-${inv.targetId}`} className="flex items-center justify-between gap-2">
                        <span>
                          الليلة {inv.night}: {inv.targetName}
                        </span>
                        <span className={inv.isMafia ? "sf-bad-text" : "sf-ok-text"}>
                          {inv.isMafia ? "مافيا 🔪" : "ليس مافيا ✅"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="sf-muted mt-4 text-center text-xs">اضغط في أي مكان للإغلاق</p>
          </div>
        </div>
      )}

      {/* أوفرلاي إعادة الاتصال — الجلسة محفوظة، وبيرجع للعبة لوحده أول ما الخط يرجع */}
      {conn === "down" && (
        <div role="alert" aria-live="polite" className="sf-overlay fixed inset-0 z-40 flex items-center justify-center p-5">
          <ReconnectCard roomCode={roomCode} onRetry={retryNow} onRejoin={rejoinFromScratch} onLeave={forceLeave} />
        </div>
      )}
    </main>
  );
}
function Screen({ children, dark }: { children: ReactNode; dark: boolean }) {
  return (
    <main
      dir="rtl"
      data-scheme={dark ? "dark" : "light"}
      className="mf-page flex min-h-dvh flex-col items-center justify-center px-4 py-6 sm:px-6"
      style={{ background: ambienceBg("", dark) }}
    >
      {children}
    </main>
  );
}

/* ---------- مكونات الاتصال ---------- */

function ReconnectCard({
  roomCode,
  onRetry,
  onRejoin,
  onLeave,
}: {
  roomCode: string;
  onRetry: () => void;
  onRejoin: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="sf-card w-full max-w-sm p-6 text-center">
      <WifiOff className="sf-warn-text mx-auto mb-3 h-12 w-12" strokeWidth={1.5} />
      <p className="text-lg font-bold">فقدنا الاتصال بالغرفة</p>
      <p className="sf-muted mt-1 text-sm leading-relaxed">
        جلستك محفوظة واللعبة شغالة — بنحاول نرجع تلقائيًا كل ثانية ونص، ومحتاج تعمل أي حاجة.
      </p>
      <div className="sf-muted mx-auto my-4 flex items-center justify-center gap-2 text-xs">
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        جارِ إعادة المحاولة...
      </div>
      <p dir="ltr" className="sf-panel sf-gold mb-4 px-3 py-2 font-mono tracking-widest">
        {roomCode}
      </p>
      <div className="grid gap-2">
        <button type="button" onClick={onRetry} className="sf-btn-primary sf-focus rounded-2xl px-4 py-3 font-bold">
          حاول الآن
        </button>
        <button type="button" onClick={onRejoin} className="sf-btn-ghost sf-focus rounded-xl px-4 py-2 text-sm">
          خروج ودخول من جديد
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="sf-muted sf-focus px-4 py-1 text-xs underline-offset-4 transition-colors hover:underline"
        >
          أو الخروج للرئيسية
        </button>
      </div>
    </div>
  );
}

function phaseChipInfo(view: PlayerView): { icon: string; text: string } {
  const { room, day, voting } = view;
  switch (room.phase) {
    case "lobby":
      return { icon: "⏳", text: "غرفة الانتظار" };
    case "role_reveal":
      return { icon: "🎭", text: "كشف الأدوار" };
    case "night":
      return { icon: "🌙", text: `الليل ${room.nightNumber}` };
    case "morning":
      return { icon: "🌅", text: "الصباح" };
    case "day_questions":
      return { icon: "☀️", text: day ? `جولة الأسئلة ${day.pairIndex + 1} من ${day.totalPairs}` : "جولة الأسئلة" };
    case "day_accusation":
      return { icon: "🗣️", text: "وقت الاتهامات" };
    case "voting":
      return { icon: "🗳️", text: voting?.isRevote ? "إعادة التصويت" : "وقت التصويت" };
    case "vote_reveal":
      return { icon: "⚖️", text: "نتيجة التصويت" };
    case "game_over":
      return { icon: "🏁", text: "نهاية اللعبة" };
    default:
      return { icon: "🎭", text: "المافيا" };
  }
}

function PhaseChip({ view }: { view: PlayerView }) {
  const info = phaseChipInfo(view);
  return (
    <div className="mb-3 flex justify-center">
      <span className="sf-chip mf-stagger flex animate-fade-in-up items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold">
        <span aria-hidden="true">{info.icon}</span>
        {info.text}
      </span>
    </div>
  );
}

function Header({
  roomCode,
  muted,
  onToggleMute,
  onHowTo,
  onLeave,
  isHost,
  onOpenRole,
}: {
  roomCode: string;
  muted: boolean;
  onToggleMute: () => void;
  onHowTo: () => void;
  onLeave: () => void;
  isHost: boolean;
  onOpenRole?: () => void;
}) {
  const iconBtn = "sf-icon-btn sf-focus h-9 w-9 rounded-full";
  return (
    <div className="sf-card sf-card-sm sticky top-2 z-20 mb-3 flex items-center justify-between gap-2 px-3 py-2 sm:top-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <VenetianMask className="sf-gold h-5 w-5 shrink-0" />
        <span dir="ltr" className="sf-gold truncate font-mono text-sm font-bold tracking-widest">
          {roomCode}
        </span>
        {isHost && (
          <span className="sf-host-badge flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
            <Crown className="h-3 w-3" />
            مضيف
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {onOpenRole && (
          <button type="button" onClick={onOpenRole} className={iconBtn} aria-label="دوري">
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onToggleMute} className={iconBtn} aria-label="الصوت">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onHowTo} className={iconBtn} aria-label="كيف تلعب">
          <CircleHelp className="h-4 w-4" />
        </button>
        <button type="button" onClick={onLeave} className={iconBtn} aria-label="خروج">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- لوبي الانتظار: عمود واحد على الفون، وعمودين (كود + تحكم | لاعبين) على الديسكتوب ---------- */

const LOBBY_TIPS = [
  "المافيا بتتفق بالتجاهل — خد بالك من اللي بيرددوا نفس الكلام.",
  "لو حد قريب منك اتقتل بالليل، غالبًا كان عند المافيا عليه حاجة.",
  "الكاشف الذكي يلمّح من غير ما يفضح نفسه بدري.",
  "الدكتور ينقذ الليلة بس — صوّت بذكاء.",
  "راقب نظرات اللاعبين وقت التصويت أكتر من كلامهم.",
  "السكوت سلاح… بس مش لكل اللعبة.",
];

function LobbyView({
  view,
  session,
  onCopy,
  onShare,
  runAction,
}: {
  view: PlayerView;
  session: SessionInfo;
  onCopy: () => void;
  onShare: () => void;
  runAction: RunAction;
}) {
  const { room, players, me } = view;
  const activeCount = players.length;
  const maxPlayers = Math.max(activeCount, room.settings.maxPlayers);
  const [copied, setCopied] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const prevCountRef = useRef(activeCount);

  // دوران نصائح الانتظار كل 6 ثواني عشان الاستقبال ميبقاش صامت
  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % LOBBY_TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  // لما حد ينضم للغرفة — صوت + اهتزاز احتفال خفيف
  useEffect(() => {
    if (activeCount > prevCountRef.current) {
      soundSuccess();
      vibrate([20, 40, 20]);
    }
    prevCountRef.current = activeCount;
  }, [activeCount]);

  function doCopy() {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const pct = Math.min(100, Math.round((activeCount / Math.max(1, maxPlayers)) * 100));
  const needMore = Math.max(0, MIN_TO_START - activeCount);
  const canStart = activeCount >= MIN_TO_START;

  // خانات الغرفة زي ألعاب الحفلات — اللاعبين الأول وباقي المقاعد أماكن فاضية
  const slots = Array.from({ length: maxPlayers }, (_, i) => players[i] ?? null);

  return (
    <div className="mf-stagger animate-fade-in-up flex flex-col gap-4 sm:gap-5 lg:grid lg:grid-cols-12 lg:gap-5">
      {/* العنوان الرئيسي */}
      <header className="text-center lg:col-span-12">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          غرفة الانتظار <span aria-hidden="true">⏳</span>
        </h1>
        <p className="sf-muted mt-1 text-sm">ابعت الكود لأصحابك وكمّلوا العدد — الليلة مافيا 🎭</p>
      </header>

      {/* كارت الكود: بلاطات كبيرة زي كودات الألعاب */}
      <section className="lg:col-span-5 lg:row-start-2">
        <div className="sf-code-card">
          <div className="sf-code-card-inner relative overflow-hidden p-5 text-center sm:p-6">
            <VenetianMask
              aria-hidden="true"
              className="sf-mark mf-float absolute -right-3 top-5 h-16 w-16 rotate-12"
              strokeWidth={1.5}
            />
            <Skull
              aria-hidden="true"
              className="sf-mark mf-float absolute -left-2 bottom-4 h-14 w-14 -rotate-12"
              style={{ animationDelay: "1.2s" }}
              strokeWidth={1.5}
            />

            <p className="sf-muted mb-3 text-sm">ابعت الكود ده لأصحابك</p>
            <div dir="ltr" className="mb-4 flex justify-center gap-1.5 sm:gap-2">
              {room.code.split("").map((ch, i) => (
                <span
                  key={i}
                  className="sf-tile mf-stagger flex h-12 w-9 animate-fade-in-up items-center justify-center rounded-xl font-mono text-2xl font-extrabold sm:h-16 sm:w-12 sm:text-4xl"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="flex justify-center gap-2.5">
              <button
                type="button"
                onClick={doCopy}
                aria-live="polite"
                className={`sf-focus flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  copied ? "sf-btn-ok" : "sf-btn-ghost"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "اتنسخ" : "نسخ"}
              </button>
              <button
                type="button"
                onClick={onShare}
                className="sf-btn-primary sf-focus flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <Share2 className="h-4 w-4" /> مشاركة
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* اللاعبون: خانات زي لوبي الألعاب */}
      <section className="lg:col-span-7 lg:row-span-2 lg:row-start-2">
        <div className="sf-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold sm:text-lg">اللاعبون</h3>
            <span className="sf-muted text-sm tabular-nums">
              دخل {activeCount} من {maxPlayers}
            </span>
          </div>

          {/* شريط تقدم اكتمال الغرفة — بيلمع لما العدد يكمل */}
          <div className="sf-progress mb-1.5">
            <div className={`sf-progress-fill ${canStart ? "ready" : ""}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="sf-muted mb-3 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
            <span>الحد الأدنى للبدء: {MIN_TO_START}</span>
            {needMore > 0 && (
              <span className="sf-warn-banner rounded-full px-2 py-0.5">
                محتاجين {needMore} {needMore === 1 ? "لاعب" : "لاعبين"} كمان
              </span>
            )}
          </div>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {slots.map((p, i) =>
              p ? (
                <li
                  key={p.id}
                  className="sf-item mf-stagger flex animate-fade-in-up items-center gap-2 px-2.5 py-2"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <Avatar name={p.name} src={p.avatar ?? null} size={32} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-[13px] font-bold">{p.name}</span>
                      {p.isHost && <Crown className="sf-gold h-3.5 w-3.5 shrink-0" aria-label="مضيف" />}
                    </span>
                    <span className="sf-muted mt-0.5 flex items-center gap-1 text-[10px]">
                      <span
                        className={`sf-dot shrink-0 ${p.connected ? "on" : "off"}`}
                        aria-label={p.connected ? "متصل" : "غير متصل"}
                      />
                      {p.isMe ? "أنت" : p.connected ? "متصل" : "غير متصل"}
                    </span>
                  </span>
                  {me.isHost && !p.isMe && (
                    <button
                      type="button"
                      aria-label={`طرد ${p.name}`}
                      onClick={() => runAction(() => api.kick(room.code, session.playerId, session.token, p.id))}
                      className="sf-btn-danger sf-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ) : (
                <li key={`empty-${i}`} className="sf-item sf-slot-empty flex items-center gap-2 px-2.5 py-2">
                  <span className="sf-circle-dashed flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs">مكان فاضي</span>
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      {/* نصيحة + زرار البدء */}
      <section className="flex flex-col gap-4 sm:gap-5 lg:col-span-5 lg:row-start-3">
        {/* نصيحة بتتغير كل شوية عشان الانتظار يبقى جزء من اللعبة */}
        <div className="sf-panel flex items-start gap-2 px-4 py-2.5">
          <span aria-hidden="true" className="text-sm">
            💡
          </span>
          <p key={tipIndex} className="sf-muted animate-fade-in-up text-xs leading-relaxed">
            <span className="sf-gold font-bold">نصيحة: </span>
            {LOBBY_TIPS[tipIndex]}
          </p>
        </div>

        {me.isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => runAction(() => api.start(room.code, session.playerId, session.token))}
            className={`sf-focus w-full rounded-2xl px-4 py-4 text-base font-bold transition-all duration-300 sm:text-lg ${
              canStart ? "sf-btn-primary" : "sf-btn-ghost disabled:pointer-events-none disabled:opacity-50"
            }`}
          >
            {canStart
              ? "ابدأ اللعبة الآن 🎬"
              : `ناقص ${needMore} ${needMore === 1 ? "لاعب" : "لاعبين"} للبدء`}
          </button>
        ) : canStart ? (
          <p className="sf-muted text-center text-sm">
            اكتمل العدد! استنى المضيف يبدأ <span className="animate-pulse">…</span>
          </p>
        ) : (
          <p className="sf-muted text-center text-sm">
            بانتظار المضيف وباقي اللاعبين <span className="animate-pulse">…</span> جهّز نفسك 🎭
          </p>
        )}
      </section>
    </div>
  );
}

function RoleRevealView({
  view,
  session,
  runAction,
  secondsLeft,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
}) {
  const { me, players, room } = view;
  const readyCount = players.filter((p) => p.ready).length;
  if (!me.roleInfo) return null;
  return (
    <div className="mf-stagger animate-fade-in-up space-y-5 text-center sm:space-y-6">
      <h2 className="sf-gold text-xl font-bold sm:text-2xl">هذا دورك في هذه الجولة</h2>
      <RoleCard
        icon={me.roleInfo.icon}
        title={me.roleInfo.title}
        description={me.roleInfo.description}
        team={me.roleInfo.team}
        mafiaTeammates={me.mafiaTeammates}
      />
      <p className="sf-muted text-xs">اضغط مطولًا على الكارت لرؤية دورك، وارفع إصبعك لإخفائه.</p>

      <button
        type="button"
        disabled={!!me.ready}
        onClick={() => runAction(() => api.ready(room.code, session.playerId, session.token))}
        className={`sf-focus w-full rounded-2xl px-4 py-4 text-lg font-bold transition-all duration-200 ${
          me.ready ? "sf-btn-ok" : "sf-btn-primary"
        }`}
      >
        {me.ready ? "بانتظار الباقي..." : "أنا جاهز ✅"}
      </button>
      <p className="sf-muted text-sm tabular-nums">
        جاهز {readyCount} من {players.length}
      </p>
      <p className="sf-muted text-xs opacity-70">{Math.ceil(secondsLeft)} ثانية متبقية كحد أقصى</p>
    </div>
  );
}

function NightView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  onOpenRole,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  onOpenRole: () => void;
}) {
  const { room, night, me } = view;
  if (!night) return null;
  const canAct = me.alive;
  // زرار "تخطّي" بيظهر لكل اللاعبين في مرحلة القناص (مش للقناص بس)،
  // عشان وجوده على شاشة واحد بس ما يكشفش إنه القناص. السيرفر بيتجاهله لو مش قناص.
  const extraOption =
    room.nightSubPhase === "extra" && night.extraRoleType === "sniper"
      ? { id: "skip", label: "⏭️ تخطّي (لا تطلق)" }
      : undefined;
  return (
    <div className="mf-stagger animate-fade-in-up space-y-4 sm:space-y-5">
      {/* بانل أجواء الليل — مقصود يفضل ليلي في الوضعين عشان إحساس اللعبة */}
      <div className="sf-night p-5 text-center sm:p-6">
        <Moon className="animate-moon mx-auto mb-2 h-12 w-12 text-indigo-200" strokeWidth={1.5} />
        <p className="text-[#aab4f8]">الليل نزل رقم {room.nightNumber}... الكل نايم</p>
        <h2 className="mt-2 text-lg font-bold text-[#f5d47f]">{night.label}</h2>
        <p className="mt-1 text-sm text-[#c9cffb]">{night.instruction}</p>
        <button type="button" onClick={onOpenRole} className="sf-night-btn sf-focus mt-3 rounded-full px-3 py-1.5 text-xs">
          <Eye className="ml-1 inline h-3.5 w-3.5 align-text-bottom" /> دوري
        </button>
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={total} />

      {night.mafiaLivePicks && night.mafiaLivePicks.length > 0 && (
        <div className="sf-danger-panel p-3 text-sm">
          <p className="sf-bad-text mb-1 font-semibold">اختيارات زملائك الحالية:</p>
          <ul className="sf-muted space-y-1">
            {night.mafiaLivePicks.map((p, i) => (
              <li key={i}>
                {p.mafiaName} ← اختار {p.targetName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlayerPickList
        choices={night.choices}
        avatars={Object.fromEntries(view.players.map((p) => [p.id, p.avatar]))}
        myChoice={night.myChoice}
        disabled={!canAct}
        forbiddenId={night.forbiddenTargetId}
        extraOption={extraOption}
        onPick={(id) => runAction(() => api.nightAction(room.code, session.playerId, session.token, id))}
      />
      {!canAct && <p className="sf-muted text-center text-xs">أنت متفرج، اختيارك هنا لا تأثير له.</p>}
    </div>
  );
}

function MorningView({ view, secondsLeft, total }: { view: PlayerView; secondsLeft: number; total: number }) {
  const { morning } = view;
  return (
    <div className="mf-stagger animate-fade-in-up space-y-5 text-center sm:space-y-6">
      <Sun className="sf-gold mf-float mx-auto h-14 w-14" strokeWidth={1.5} />
      <h2 className="sf-gold text-xl font-bold sm:text-2xl">صباح الخير أيها الناجون</h2>
      {morning?.noneKilled ? (
        <p className="sf-ok-text text-lg font-semibold">🕊️ لم يمت أحد الليلة الماضية!</p>
      ) : (
        <div className="space-y-1">
          {morning?.killedNames.map((n) => (
            <p key={n} className="sf-bad-text text-lg font-semibold">
              💀 توفي الليلة الماضية: {n}
            </p>
          ))}
        </div>
      )}
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
    </div>
  );
}

function ChatLog({ view }: { view: PlayerView }) {
  return (
    <div className="sf-panel sf-scroll max-h-64 space-y-2 overflow-y-auto p-3">
      {view.chat.length === 0 && <p className="sf-muted text-center text-xs">لا توجد رسائل بعد</p>}
      {view.chat.map((c) => (
        <div key={c.id} className="text-sm">
          {c.type === "system" ? (
            <p className="sf-muted text-center text-xs">{c.text}</p>
          ) : (
            <p>
              <span className={`font-bold ${c.type === "accusation" ? "sf-bad-text" : "sf-gold"}`}>
                {c.fromName}:
              </span>{" "}
              <span>{c.text}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DayQuestionsView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  textInput,
  setTextInput,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  textInput: string;
  setTextInput: (v: string) => void;
}) {
  const { day, room } = view;
  if (!day) return null;
  const isQuestionStep = day.subPhase === "question";
  const mustAct =
    (isQuestionStep && day.isAsker && !day.questionSubmitted) ||
    (!isQuestionStep && day.isAnswerer && !day.answerSubmitted);

  async function submit() {
    if (!textInput.trim()) return;
    if (isQuestionStep) {
      await runAction(() => api.question(room.code, session.playerId, session.token, textInput.trim()));
    } else {
      await runAction(() => api.answer(room.code, session.playerId, session.token, textInput.trim()));
    }
    setTextInput("");
  }

  return (
    <div className="mf-stagger animate-fade-in-up space-y-4">
      <div className="sf-card p-5 text-center">
        <p className="sf-muted text-xs">
          جولة أسئلة {day.pairIndex + 1} من {day.totalPairs}
        </p>
        <h2 className="sf-gold mt-1 text-lg font-bold">
          {day.askerName} يسأل {day.answererName}
        </h2>
        <p className="sf-muted mt-1 text-sm">
          {isQuestionStep ? "بانتظار السؤال..." : "بانتظار الإجابة..."}
        </p>
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={total} />

      {mustAct ? (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, 140))}
            placeholder={isQuestionStep ? "اكتب سؤالك هنا (حتى 140 حرفًا)" : "اكتب إجابتك هنا (حتى 140 حرفًا)"}
            className="sf-input sf-focus rounded-2xl p-3 text-sm"
            rows={3}
          />
          <div className="sf-muted flex items-center justify-between text-xs">
            <span>{textInput.length}/140</span>
            <button type="button" onClick={submit} className="sf-btn-primary sf-focus rounded-xl px-5 py-2 text-sm font-bold">
              إرسال
            </button>
          </div>
        </div>
      ) : (
        <p className="sf-muted text-center text-sm">
          {day.isAsker || day.isAnswerer ? "بانتظار الطرف الآخر..." : "تابع المحادثة أدناه"}
        </p>
      )}

      <ChatLog view={view} />
    </div>
  );
}

function AccusationView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  textInput,
  setTextInput,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  textInput: string;
  setTextInput: (v: string) => void;
}) {
  const { accusation, room } = view;
  async function submit() {
    if (!textInput.trim()) return;
    await runAction(() => api.accuse(room.code, session.playerId, session.token, textInput.trim()));
    setTextInput("");
  }
  return (
    <div className="mf-stagger animate-fade-in-up space-y-4">
      <div className="sf-card p-5 text-center">
        <h2 className="sf-gold text-lg font-bold">🗣️ وقت الاتهامات</h2>
        <p className="sf-muted mt-1 text-sm">رسالة واحدة قصيرة لكل لاعب</p>
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      {accusation?.canSubmit && !accusation.submitted ? (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, 100))}
            placeholder="اكتب اتهامك أو رأيك هنا (حتى 100 حرف)"
            className="sf-input sf-focus rounded-2xl p-3 text-sm"
            rows={2}
          />
          <div className="sf-muted flex items-center justify-between text-xs">
            <span>{textInput.length}/100</span>
            <button type="button" onClick={submit} className="sf-btn-primary sf-focus rounded-xl px-5 py-2 text-sm font-bold">
              إرسال
            </button>
          </div>
        </div>
      ) : (
        <p className="sf-muted text-center text-sm">
          {accusation?.submitted ? "تم إرسال رسالتك ✅" : "أنت متفرج الآن"}
        </p>
      )}
      <ChatLog view={view} />
    </div>
  );
}

function VotingView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
}) {
  const { voting, room, me } = view;
  if (!voting) return null;
  return (
    <div className="mf-stagger animate-fade-in-up space-y-4">
      <div className="sf-card p-5 text-center">
        <h2 className="sf-gold text-lg font-bold">🗳️ {voting.isRevote ? "إعادة التصويت" : "وقت التصويت"}</h2>
        <p className="sf-muted mt-1 text-sm">صوّتك سري حتى تنتهي الجولة</p>
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      {me.alive ? (
        <PlayerPickList
          choices={voting.choices}
          avatars={Object.fromEntries(view.players.map((p) => [p.id, p.avatar]))}
          myChoice={voting.myVote}
          extraOption={{ id: "abstain", label: "🤷 امتناع" }}
          onPick={(id) => runAction(() => api.vote(room.code, session.playerId, session.token, id))}
        />
      ) : (
        <p className="sf-muted text-center text-sm">أنت متفرج، لا يمكنك التصويت.</p>
      )}
      {voting.hasVoted && me.alive && (
        <p className="sf-ok-text text-center text-sm font-semibold">تم تسجيل صوتك ✅ بانتظار الباقي...</p>
      )}
    </div>
  );
}

function VoteRevealView({ view, secondsLeft, total }: { view: PlayerView; secondsLeft: number; total: number }) {
  const r = view.voteReveal;
  if (!r) return null;
  return (
    <div className="mf-stagger animate-fade-in-up space-y-4">
      <div className="sf-card p-5 text-center">
        <h2 className="sf-gold text-lg font-bold">نتيجة التصويت</h2>
        {r.eliminatedName ? (
          <p className="sf-bad-text mt-2 text-lg font-semibold">⚖️ تم إعدام {r.eliminatedName}</p>
        ) : r.revote ? (
          <p className="sf-warn-text mt-2 text-lg font-semibold">تعادل! ستتم إعادة التصويت بين المتعادلين</p>
        ) : (
          <p className="sf-warn-text mt-2 text-lg font-semibold">تعادل الأصوات، لم يتم إعدام أحد</p>
        )}
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      <div className="sf-panel p-3">
        <p className="mb-2 text-sm font-bold">تفاصيل الأصوات:</p>
        <ul className="sf-muted space-y-1 text-sm">
          {r.results.map((v, i) => (
            <li key={i}>
              {v.voterName} ← {v.targetName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GameOverView({ view, session, runAction }: { view: PlayerView; session: SessionInfo; runAction: RunAction }) {
  const g = view.gameOver;
  if (!g) return null;
  const citizensWon = g.winner === "citizens";
  return (
    <div className="mf-stagger animate-fade-in-up space-y-5 text-center">
      {/* أيقونة الفوز بإضاءة خلفية */}
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full blur-2xl ${citizensWon ? "bg-[var(--gold)]/20" : "bg-red-500/20"}`}
        />
        {citizensWon ? (
          <Trophy className="sf-gold mf-float relative h-16 w-16" strokeWidth={1.5} />
        ) : (
          <Skull className="mf-float relative h-16 w-16 text-[var(--accent)]" strokeWidth={1.5} />
        )}
      </div>
      <h2 className="sf-gold text-2xl font-extrabold sm:text-3xl">
        {citizensWon ? "فاز المواطنون الصالحون!" : "فازت المافيا!"}
      </h2>

      <div className="sf-card p-4 text-right">
        <p className="mb-2 font-bold">كشف الأدوار:</p>
        <ul className="space-y-1 text-sm">
          {g.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={p.name} src={p.avatar} size={28} />
                <span className="truncate">
                  {p.roleInfo?.icon} {p.name} {!p.alive && "💀"}
                </span>
              </span>
              <span className={`shrink-0 font-semibold ${p.roleInfo?.team === "mafia" ? "sf-bad-text" : "sf-ok-text"}`}>
                {p.roleInfo?.title}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {g.nightLogs.length > 0 && (
        <div className="sf-panel p-4 text-right">
          <p className="mb-2 font-bold">ملخص الليالي:</p>
          <ul className="sf-muted space-y-1 text-sm">
            {g.nightLogs.map((n) => (
              <li key={n.night}>
                الليلة {n.night}: {n.killedNames.length ? `مات ${n.killedNames.join("، ")}` : "لم يمت أحد"}
                {n.savedName ? ` (تم إنقاذ ${n.savedName})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.me.isHost ? (
        <button
          type="button"
          onClick={() => runAction(() => api.playAgain(view.room.code, session.playerId, session.token))}
          className="sf-btn-primary sf-focus w-full rounded-2xl px-4 py-4 text-lg font-bold"
        >
          العب تاني 🔁
        </button>
      ) : (
        <p className="sf-muted text-sm">بانتظار المضيف لبدء جولة جديدة...</p>
      )}
    </div>
  );
}