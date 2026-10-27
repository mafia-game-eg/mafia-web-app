"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/mafia/HeroCarousel";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  DoorOpen,
  History,
  Home,
  Moon,
  Search,
  Skull,
  Stethoscope,
  Sun,
  Users,
  Vote,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { listSessions } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import ImageButton from "@/components/mafia/ImageButton";
import TeamSplit from "@/components/mafia/TeamSplit";

// دورة اللعبة: ليل ← نهار ← تصويت
const phases = [
  { title: "الليل", desc: "المافيا تضرب", icon: Moon },
  { title: "النهار", desc: "نقاش واتهامات", icon: Sun },
  { title: "التصويت", desc: "إعدام مشتبه", icon: Vote },
];

// الأدوار في التشكيلة المثالية (3 + 1 + 1 + 9 = 14 لاعب)
const roleChips = [
  { name: "مافيا", count: 3, icon: Skull, cls: "text-rose-400" },
  { name: "دكتور", count: 1, icon: Stethoscope, cls: "text-emerald-400" },
  { name: "كاشف", count: 1, icon: Search, cls: "text-sky-400" },
  { name: "مواطن", count: 9, icon: Users, cls: "text-amber-300" },
];

// خطوات البداية (بتظهر على كل الشاشات، بحجم أصغر على الموبايل)
const startSteps = [
  { n: "1", title: "اعمل غرفة", desc: "من زرار «إنشاء غرفة»" },
  { n: "2", title: "وزّع الكود", desc: "ابعته لأصحابك يدخلوا بيه" },
  { n: "3", title: "ابدأوا اللعب", desc: "ليل ونهار وتصويت" },
];

const GAP = "gap-3.5 md:gap-5 lg:gap-6";

// كلاسات مشتركة للكروت والأزرار الثانوية
const CARD = "rounded-2xl border border-white/10 bg-white/[0.03]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

// وصف مرحلة الغرفة بشكل أدق (مع fallback آمن)
function phaseLabel(phase: string) {
  if (phase === "lobby") return "في الانتظار";
  if (phase === "night") return "اللعبة جارية · الليل";
  if (phase === "day") return "اللعبة جارية · النهار";
  if (phase === "vote") return "اللعبة جارية · التصويت";
  if (phase === "game_over") return "انتهت اللعبة";
  return "اللعبة جارية";
}

// اهتزاز خفيف على الموبايل (بيتجاهل بأمان على الديسكتوب)
function haptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
  } catch {
    // مفيش مشكلة لو الاهتزاز مش مدعوم
  }
}

// تأخير متدرج لحركات الدخول
function stagger(i: number) {
  return { animationDelay: `${i * 70}ms` };
}

export default function HomeClient() {
  const router = useRouter();
  const [showHowTo, setShowHowTo] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{ roomCode: string; phase: string } | null>(null);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);

  // تحميل الصفحتين مقدمًا عشان الفتح يبقى فوري
  useEffect(() => {
    router.prefetch("/create");
    router.prefetch("/join");
  }, [router]);

  // لو ليك غرفة شغالة: نعرض زرار "العودة إلى غرفتك" — ولو مفيش، نعرض الغرف القديمة
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessions = listSessions().slice(0, 3);
      const oldCodes: string[] = [];
      for (const s of sessions) {
        if (cancelled) return;
        try {
          const res = await api.state(s.roomCode, s.playerId, s.token);
          if (cancelled) return;
          if (res.ok && res.view) {
            setActiveRoom({ roomCode: s.roomCode, phase: res.view.room.phase });
            setRecentRooms(oldCodes.slice(0, 2));
            return;
          }
        } catch {
          // الشبكة واقفة أو الغرفة مردوشة — نكمل عادي من غير unhandled rejection
        }
        if (!oldCodes.includes(s.roomCode)) oldCodes.push(s.roomCode);
      }
      if (!cancelled) setRecentRooms(oldCodes.slice(0, 2));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <style>{`
        /* الصفحة بتتمركز رأسيًا لو الشاشة طويلة، ولو قصيرة بتسكرول عادي من غير ما حاجة تتقصّ */
        .mf-stagger { animation-fill-mode: both; }

        /* موبايل أفقي / شاشة قصيرة وعريضة: عمودين بدل عمود واحد طويل */
        @media (orientation: landscape) and (min-width: 640px) and (max-height: 520px) {
          .mf-home { max-width: 60rem !important; justify-content: flex-start !important; }
          .mf-grid { grid-template-columns: 1fr 1fr !important; align-items: center; column-gap: 1.5rem !important; }
          .mf-hero { max-width: 18rem; margin-inline: auto; }
        }

        /* احترام تقليل الحركة للمستخدمين اللي بيفضلوا كده */
        @media (prefers-reduced-motion: reduce) {
          .mf-home *, .mf-home *::before, .mf-home *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={() => {}} />

      <main
        className={`mf-home relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-5 md:max-w-2xl md:px-8 md:pt-6 lg:max-w-5xl lg:px-10 xl:max-w-6xl ${GAP}`}
        dir="rtl"
      >
        {/* إضاءة خلفية خفيفة (شكل بس — مش بتستقبل كليكات) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 z-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--town)] opacity-[0.07] blur-3xl md:h-72 md:w-72"
        />

        {/* العودة للغرفة الشغالة */}
        {activeRoom && (
          <button
            type="button"
            onClick={() => {
              haptic();
              router.push(`/room/${activeRoom.roomCode}`);
            }}
            aria-live="polite"
            className={`relative z-10 flex min-h-[56px] w-full animate-fade-in-up items-center justify-between gap-3 self-center rounded-2xl border border-white/10 bg-[var(--bg-1)] px-4 py-3 text-right transition-colors duration-200 hover:bg-white/[0.06] active:scale-[0.98] md:max-w-md ${FOCUS}`}
          >
            <span className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--town)] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--town)]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold md:text-base">العودة إلى غرفتك</span>
                <span className="block truncate text-xs text-[var(--text-1)] md:text-sm">
                  {phaseLabel(activeRoom.phase)}
                  {" · "}الكود {activeRoom.roomCode}
                </span>
              </span>
            </span>
            <ArrowLeft className="h-5 w-5 shrink-0 text-[var(--text-1)]" aria-hidden="true" />
          </button>
        )}

        {/* موبايل/تابلت عمودي: عمود واحد — لابتوب/ديسكتوب: عمودين (الكاروسيل | باقي المحتوى) */}
        <div
          className={`mf-grid relative z-10 grid grid-cols-1 lg:grid-cols-2 lg:items-center lg:gap-14 xl:gap-20 ${GAP}`}
        >
          {/* العمود الأول: الكاروسيل */}
          <div className="mf-hero animate-fade-in-up text-center">
            <h1 className="sr-only">المافيا</h1>
            {/* الهامش السالب على الموبايل بس: يخلي الكاروسيل بنفس عرض المحتوى اللي تحته */}
            <div className="-mx-2 w-full max-w-md sm:mx-auto md:max-w-lg lg:max-w-none">
              <HeroCarousel />
            </div>
          </div>

          {/* العمود التاني: المحتوى */}
          <div className={`mx-auto flex w-full min-w-0 flex-col md:max-w-xl lg:max-w-none ${GAP}`}>
            <div className="mf-stagger animate-fade-in-up" style={stagger(0)}>
              <TeamSplit town={11} mafia={3} label="التشكيلة المثالية · 14 لاعب" />
            </div>

            {/* أزرار الإجراء الأساسية */}
            <div
              className="mf-stagger grid animate-fade-in-up grid-cols-2 gap-3 md:gap-4"
              style={stagger(1)}
            >
              <ImageButton
                title="إنشاء غرفة"
                subtitle="ابدأ لعبة جديدة"
                icon={<Home strokeWidth={2} />}
                plus
                onClick={() => {
                  haptic();
                  router.push("/create");
                }}
              />
              <ImageButton
                title="دخول غرفة"
                subtitle="معاك كود الغرفة؟"
                icon={<DoorOpen strokeWidth={2} />}
                onClick={() => {
                  haptic();
                  router.push("/join");
                }}
              />
            </div>

            {/* الأدوار + دورة اللعبة: جنب بعض على التابلت، فوق بعض على الموبايل والديسكتوب */}
            <div
              className="mf-stagger grid animate-fade-in-up grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch md:gap-4 lg:grid-cols-1"
              style={stagger(2)}
            >
              {/* شريط الأدوار */}
              <section
                aria-label="الأدوار في التشكيلة المثالية"
                className={`${CARD} flex flex-col justify-center gap-2 px-3 py-3 md:px-4`}
              >
                <h2 className="text-center text-[11px] font-bold text-[var(--text-1)] md:text-xs">
                  الأدوار
                </h2>
                <ul className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
                  {roleChips.map((r) => {
                    const Icon = r.icon;
                    return (
                      <li
                        key={r.name}
                        title={`${r.name}: ${r.count}`}
                        className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold md:text-xs"
                      >
                        <Icon className={`h-3.5 w-3.5 ${r.cls}`} strokeWidth={2.2} aria-hidden="true" />
                        <span>{r.name}</span>
                        <span className="text-[var(--text-1)]">{r.count}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* دورة اللعبة */}
              <section
                aria-label="دورة اللعبة"
                className={`${CARD} flex items-center px-3 py-3 md:px-4`}
              >
                <ol className="flex w-full items-center justify-between">
                  {phases.map((p, i) => {
                    const Icon = p.icon;
                    return (
                      <li key={p.title} className="flex flex-1 items-center">
                        <div className="flex flex-1 flex-col items-center gap-1 text-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white">
                            <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                          </span>
                          <span className="text-xs font-bold leading-tight md:text-[13px]">{p.title}</span>
                          <span className="text-[10px] leading-tight text-[var(--text-1)] md:text-[11px]">
                            {p.desc}
                          </span>
                        </div>
                        {i < phases.length - 1 && (
                          <ChevronLeft
                            className="h-4 w-4 shrink-0 text-white/25"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>

            {/* خطوات البداية */}
            <section
              aria-label="خطوات البداية"
              className="mf-stagger animate-fade-in-up"
              style={stagger(3)}
            >
              <ol className="grid grid-cols-3 items-stretch gap-3">
                {startSteps.map((s, i) => (
                  <li key={s.n} className={`${CARD} relative px-2 py-2.5 text-center md:px-3 md:py-3`}>
                    {i < startSteps.length - 1 && (
                      <ChevronLeft
                        className="absolute -left-[13px] top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/30"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                    <span className="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-black md:h-7 md:w-7 md:text-xs">
                      {s.n}
                    </span>
                    <span className="block text-xs font-bold md:text-[13px]">{s.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--text-1)] md:text-[11px]">
                      {s.desc}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {/* زرار شرح اللعبة */}
            <button
              type="button"
              onClick={() => {
                haptic();
                setShowHowTo(true);
              }}
              className={`mf-stagger mx-auto flex min-h-[44px] animate-fade-in-up items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-[var(--text-1)] transition-colors duration-200 hover:bg-white/[0.08] active:scale-95 md:text-sm ${FOCUS}`}
              style={stagger(4)}
            >
              <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              أول مرة تلعب؟ تعلّم اللعبة
            </button>

            {/* غرف قديمة محفوظة — تظهر لو مفيش غرفة شغالة دلوقتي */}
            {recentRooms.length > 0 && !activeRoom && (
              <div
                className="mf-stagger flex animate-fade-in-up flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-1)]"
                style={stagger(5)}
              >
                <History className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                <span>غرف قديمة:</span>
                {recentRooms.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      haptic();
                      router.push(`/room/${code}`);
                    }}
                    className={`min-h-[32px] rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs tracking-widest transition-colors duration-200 hover:bg-white/[0.1] active:scale-95 ${FOCUS}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}

            {/* سطر ختامي خفيف */}
            <p
              className="mf-stagger animate-fade-in-up text-center text-[11px] leading-relaxed text-[var(--text-1)] md:text-xs"
              style={stagger(6)}
            >
              المافيا · لعبة جماعية أونلاين — اعمل غرفة، ادعو أصحابك، واكتشف المافيا قبل ما تتكاثر
            </p>
          </div>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}