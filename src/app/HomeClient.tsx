"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/mafia/HeroCarousel";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  DoorOpen,
  Home,
  Moon,
  Sun,
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

const GAP = "gap-[clamp(10px,2.2dvh,20px)]";

export default function HomeClient() {
  const router = useRouter();
  const [showHowTo, setShowHowTo] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{ roomCode: string; phase: string } | null>(null);

  // تحميل الصفحتين مقدمًا عشان الفتح يبقى فوري
  useEffect(() => {
    router.prefetch("/create");
    router.prefetch("/join");
  }, [router]);

  // لو لسه ليك غرفة شغالة: نعرض زرار "العودة إلى غرفتك"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const s of listSessions().slice(0, 3)) {
        const res = await api.state(s.roomCode, s.playerId, s.token);
        if (cancelled) return;
        if (res.ok && res.view) {
          setActiveRoom({ roomCode: s.roomCode, phase: res.view.room.phase });
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <style>{`
        /* من غير سكرول في الصفحة الرئيسية (لما الشاشة طولها كفاية) */
        @media (min-height: 561px) {
          html:has(.mf-home), body:has(.mf-home) {
            height: 100%;
            overflow: hidden;
            overscroll-behavior: none;
          }
        }
        /* شاشة قصيرة جدًا (موبايل أفقي مثلًا): نسمح بالسكرول عشان مفيش حاجة تتقصّ */
        @media (max-height: 560px) {
          .mf-home {
            height: auto !important;
            min-height: calc(100dvh - 5rem);
            overflow: visible !important;
          }
        }
        /* شريط الدورة بيختفي في الموبايل/التابلت القصير بس */
        @media (max-height: 700px) and (max-width: 1023px) {
          .mf-phases { display: none; }
        }
      `}</style>

      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={() => {}} />
      <main
        className={`mf-home relative isolate mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center overflow-hidden px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 md:max-w-xl md:px-8 lg:max-w-5xl lg:px-10 xl:max-w-6xl ${GAP}`}
        dir="rtl"
      >
        {/* خلفية: شبكة نقط + توهّج خفيف أحمر */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 38% at 50% 8%, rgba(239,68,68,0.14), transparent 70%), radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 22px 22px",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 70% at 50% 30%, #000 0%, transparent 85%)",
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 30%, #000 0%, transparent 85%)",
          }}
        />

        {activeRoom && (
          <button
            onClick={() => router.push(`/room/${activeRoom.roomCode}`)}
            className="flex w-full animate-fade-in-up items-center justify-between gap-3 self-center rounded-2xl border border-white/10 bg-[var(--bg-1)] px-4 py-3 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98] lg:max-w-md"
          >
            <span className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--town)] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--town)]" />
              </span>
              <span>
                <span className="block text-sm font-bold">العودة إلى غرفتك</span>
                <span className="block text-xs text-[var(--text-1)]">
                  {activeRoom.phase === "lobby"
                    ? "في الانتظار"
                    : activeRoom.phase === "game_over"
                      ? "انتهت اللعبة"
                      : "اللعبة جارية"}
                  {" · "}الكود {activeRoom.roomCode}
                </span>
              </span>
            </span>
            <ArrowLeft className="h-5 w-5 text-[var(--text-1)]" />
          </button>
        )}

        {/* موبايل/تابلت: عمود واحد — لابتوب/تابلت أفقي: عمودين (الكاروسيل | باقي المحتوى) */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 lg:items-center lg:gap-14 xl:gap-20 ${GAP}`}>
          <div className="animate-fade-in-up text-center">
            <h1 className="sr-only">المافيا</h1>
            {/* الهامش السالب يخلي الكاروسيل يطلع بنفس عرض الخط اللي تحته */}
            <div className="-mx-2.5 lg:mx-0">
              <HeroCarousel />
            </div>
          </div>

          <div className={`flex flex-col ${GAP}`}>
            <div className="animate-fade-in-up">
              <TeamSplit town={11} mafia={3} label="التشكيلة المثالية · 14 لاعب" />
            </div>

            <div className="grid animate-fade-in-up grid-cols-2 gap-3 md:gap-4">
              <ImageButton
                title="إنشاء غرفة"
                subtitle="ابدأ لعبة جديدة"
                icon={<Home strokeWidth={2} />}
                plus
                onClick={() => router.push("/create")}
              />
              <ImageButton
                title="دخول غرفة"
                subtitle="معاك كود الغرفة؟"
                icon={<DoorOpen strokeWidth={2} />}
                onClick={() => router.push("/join")}
              />
            </div>

            {/* دورة اللعبة */}
            <div
              className="mf-phases animate-fade-in-up rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 md:px-5 md:py-3"
              aria-label="دورة اللعبة"
            >
              <ol className="flex items-center justify-between">
                {phases.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.title} className="flex flex-1 items-center">
                      <div className="flex flex-1 flex-col items-center gap-1 text-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white md:h-9 md:w-9">
                          <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" strokeWidth={2} />
                        </span>
                        <span className="text-[12px] font-bold leading-none md:text-[13px]">
                          {p.title}
                        </span>
                        <span className="text-[10px] leading-none text-[var(--text-1)] md:text-[11px]">
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
            </div>

            {/* زرار شرح اللعبة */}
            <button
              onClick={() => setShowHowTo(true)}
              className="mx-auto flex animate-fade-in-up items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-[var(--text-1)] transition-all duration-200 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2} />
              أول مرة تلعب؟ تعلّم اللعبة
            </button>
          </div>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}