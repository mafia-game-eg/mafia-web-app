"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, DoorOpen, History, KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { getLastName, listSessions, saveSession } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

const NAME_REQUIRED_MSG = "اكتب اسمك أولًا من الصورة الشخصية أعلى الشاشة.";
const CODE_LENGTH = 5;
const NETWORK_ERROR_MSG = "حصلت مشكلة في الاتصال. اتأكد من النت وجرّب تاني.";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0";

// اهتزاز خفيف على الموبايل (بيتجاهل بأمان على الديسكتوب)
function haptic(pattern: number | number[] = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // مش مدعوم؟ عادي، مكملين
  }
}

// تأخير متدرج لحركات الدخول
function stagger(i: number) {
  return { animationDelay: `${i * 70}ms` };
}

export default function JoinRoomClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [digits, setDigits] = useState<string[]>(Array<string>(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [showHowTo, setShowHowTo] = useState(false);

  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const roomCode = digits.join("");
  const codeComplete = roomCode.length === CODE_LENGTH;

  useEffect(() => {
    const p = loadProfile();
    setName(p.name || getLastName());
    // غرفك القديمة عشان تملّي الكود بضغطة واحدة
    try {
      const codes = Array.from(new Set(listSessions().map((s) => s.roomCode))).slice(0, 3);
      setRecentRooms(codes);
    } catch {
      // لو التخزين مش متاح نكمل عادي
    }
  }, []);

  // تعبئة الكود كله مرة واحدة (من الغرف القديمة أو اللصق)
  function fillCode(raw: string) {
    const arr = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH).split("");
    if (!arr.length) return;
    const next = Array<string>(CODE_LENGTH).fill("");
    arr.forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    setError("");
    boxRefs.current[Math.min(arr.length, CODE_LENGTH) - 1]?.focus();
  }

  // خانة واحدة: حرف واحد يعدّي للخانة اللي بعدها، وأكتر من حرف يتوزع ورا بعض
  function handleBoxChange(i: number, raw: string) {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const next = [...digits];
    if (!clean) {
      next[i] = "";
      setDigits(next);
      return;
    }
    let idx = i;
    for (const ch of clean) {
      if (idx >= CODE_LENGTH) break;
      next[idx] = ch;
      idx++;
    }
    setDigits(next);
    setError("");
    if (next.every((d) => d)) haptic(8);
    boxRefs.current[Math.min(idx, CODE_LENGTH) - 1]?.focus();
  }

  // Backspace في خانة فاضية يرجع للخانة اللي قبلها — والأسهم تتنقل عادي
  function handleBoxKeyDown(i: number, e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        setDigits(next);
      } else if (i > 0) {
        next[i - 1] = "";
        setDigits(next);
        boxRefs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      if (!digits[i]) return;
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      boxRefs.current[i - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      boxRefs.current[i + 1]?.focus();
    }
  }

  // لصق في أي خانة: الكود كله يتوزع على الخانات من الأول
  function handleBoxPaste(e: ReactClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;
    haptic();
    fillCode(text);
  }

  function failWith(msg: string) {
    setError(msg);
    setShaking(true);
    haptic([16, 60, 16]);
  }

  async function handleJoin() {
    if (loading) return;
    setError("");
    if (!name.trim()) {
      failWith(NAME_REQUIRED_MSG);
      return;
    }
    if (!codeComplete) {
      failWith(`اكتب الكود كامل (${CODE_LENGTH} حروف وأرقام).`);
      return;
    }
    setLoading(true);
    try {
      const av = await shrinkAvatar(loadProfile().avatar);
      const res = await api.join({
        roomCode,
        playerName: name.trim(),
        avatar: av,
      });
      if (!res.ok) {
        failWith(res.error);
        return;
      }
      saveSession({
        roomCode: res.roomCode,
        playerId: res.playerId,
        token: res.token,
        name: name.trim(),
      });
      haptic([10, 40, 10]);
      router.push(`/room/${res.roomCode}`);
    } catch {
      failWith(NETWORK_ERROR_MSG);
    } finally {
      setLoading(false);
    }
  }

  const primaryBtn =
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-black shadow-md shadow-white/10 transition-all duration-200 ease-out hover:bg-white/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  function boxCls(filled: boolean) {
    return [
      "h-14 w-11 rounded-xl border text-center text-2xl font-extrabold text-white outline-none transition-all duration-200 md:h-16 md:w-12 md:text-3xl",
      filled ? "border-white/60 bg-white/[0.08]" : "border-white/15 bg-[var(--bg-0)]",
      "focus:border-white focus:bg-white/[0.1] focus:ring-2 focus:ring-white/30",
      "disabled:pointer-events-none disabled:opacity-50",
    ].join(" ");
  }

  return (
    <>
      <style>{`
        /* الحركات المتدرجة تاخد fill-mode: both عشان مفيش وميض قبل ما الحركة تبدأ */
        .mf-stagger { animation-fill-mode: both; }
        /* اهتزاز خفيف لما يحصل خطأ */
        @keyframes mf-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .mf-shake { animation: mf-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        /* الشاشات القصيرة: الغرف القديمة والفوتر يتخفوا عشان الكارت يفضل بارز */
        @media (max-height: 620px) and (max-width: 1023px) {
          .mf-extras { display: none; }
        }
        /* احترام تقليل الحركة للمستخدمين اللي بيفضلوا كده */
        @media (prefers-reduced-motion: reduce) {
          .mf-join *, .mf-join *::before, .mf-join *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={(p) => setName(p.name)} />

      {/* نفس عرض الـ Navbar: موبايل / تابلت / ديسكتوب */}
      <main
        className="mf-join relative mx-auto w-full max-w-md px-4 pb-10 pt-4 md:max-w-2xl md:px-6 md:pt-8 lg:max-w-5xl lg:px-8"
        dir="rtl"
      >
        {/* توهج خلفي خفيف (شكل بس — مش بيستقبل كليكات) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 z-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--town)] opacity-[0.07] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-[-10%] z-0 h-64 w-64 rounded-full bg-[var(--gold)] opacity-[0.05] blur-3xl"
        />

        <header className="relative z-10 flex animate-fade-in-up items-center gap-3">
          <button
            type="button"
            aria-label="رجوع"
            onClick={() => {
              haptic();
              router.push("/");
            }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] transition-all duration-200 hover:bg-white/10 active:scale-90 ${focusRing}`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold md:text-2xl">دخول غرفة</h1>
            <p className="text-xs text-[var(--text-1)] md:text-sm">
              اكتب الكود اللي وصلك من صاحب الغرفة
            </p>
          </div>
        </header>

        <div className="relative z-10 mx-auto mt-5 w-full max-w-md md:mt-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-1)] p-5 shadow-2xl shadow-black/20 md:p-6"
          >
            {/* خط ضوئي رفيع أعلى الكارت */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent"
            />

            <div className="mf-stagger animate-fade-in-up" style={stagger(0)}>
              <label
                htmlFor="room-code-0"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-1)]"
              >
                <KeyRound className="h-3.5 w-3.5" strokeWidth={2} />
                كود الغرفة
              </label>

              {/* خانات الكود: صف LTR عشان الكود الإنجليزي، واللصق يتوزع لوحده */}
              <div
                dir="ltr"
                className={`flex items-center justify-between gap-2 ${shaking ? "mf-shake" : ""}`}
                onAnimationEnd={(e) => {
                  if (e.animationName === "mf-shake") setShaking(false);
                }}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxRefs.current[i] = el;
                    }}
                    id={`room-code-${i}`}
                    aria-label={`خانة ${i + 1} من ${CODE_LENGTH}`}
                    value={d}
                    onChange={(e) => handleBoxChange(i, e.target.value)}
                    onKeyDown={(e) => handleBoxKeyDown(i, e)}
                    onPaste={handleBoxPaste}
                    onFocus={(e) => e.currentTarget.select()}
                    disabled={loading}
                    type="text"
                    dir="ltr"
                    inputMode="text"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className={boxCls(d.length > 0)}
                  />
                ))}
              </div>

              <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--text-1)]">
                {CODE_LENGTH} حروف وأرقام إنجليزي — وتقدر تلصق الكود في أي خانة وهو يتوزع لوحده
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !codeComplete}
              className={`mt-4 ${primaryBtn}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جارِ الدخول...
                </>
              ) : (
                <>
                  <DoorOpen className="h-5 w-5" />
                  دخول
                </>
              )}
            </button>
          </form>

          {/* غرفك القديمة: ضغطة واحدة تملّي الكود */}
          {recentRooms.length > 0 && (
            <div
              className="mf-extras mf-stagger mt-4 flex animate-fade-in-up flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-1)]"
              style={stagger(1)}
            >
              <History className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              <span>غرفك القديمة:</span>
              {recentRooms.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    haptic();
                    fillCode(code);
                  }}
                  className={`rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] tracking-widest transition-all duration-200 hover:bg-white/[0.1] active:scale-95 ${focusRing}`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}

          {/* سطر مساعدة خفيف */}
          <p
            className="mf-extras mf-stagger mt-4 hidden animate-fade-in-up text-center text-[10px] leading-relaxed text-[var(--text-1)] sm:block"
            style={stagger(2)}
          >
            مش معاك الكود؟ اطلبه من صاحب الغرفة — وكل واحد يدخل باسمه هو
          </p>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}
