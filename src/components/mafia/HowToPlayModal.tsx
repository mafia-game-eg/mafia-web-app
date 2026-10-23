"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Megaphone,
  MessagesSquare,
  Moon,
  Search,
  ShieldCheck,
  Skull,
  Sun,
  Trophy,
  Vote,
  VolumeX,
  X,
} from "lucide-react";

type Tone = "town" | "mafia";
type Item = { icon: ReactNode; title: string; text: string; tone?: Tone };
type Step = { id: string; label: string; icon: ReactNode; lead: string; items: Item[] };

const ic = "h-5 w-5";

const STEPS: Step[] = [
  {
    id: "night",
    label: "الليل",
    icon: <Moon className="h-4 w-4" />,
    lead: "كل المراحل بنفس المدة لكل اللاعبين، فلا أحد يعرف دور غيره من طريقة استخدامه للتطبيق.",
    items: [
      {
        icon: <Skull className={ic} />,
        title: "المافيا",
        text: "تتفق على ضحية وتقتلها كل ليلة.",
        tone: "mafia",
      },
      {
        icon: <HeartPulse className={ic} />,
        title: "الطبيب",
        text: "ينقذ شخصًا واحدًا، ولا يكرر نفس الشخص ليلتين متتاليتين.",
        tone: "town",
      },
      {
        icon: <Search className={ic} />,
        title: "المحقق",
        text: "يعرف إن كان شخص ما من المافيا، والنتيجة تظهر له وحده.",
        tone: "town",
      },
    ],
  },
  {
    id: "day",
    label: "النهار",
    icon: <Sun className="h-4 w-4" />,
    lead: "الصباح يبدأ بخبر، ثم نقاش يديره التطبيق.",
    items: [
      {
        icon: <Sun className={ic} />,
        title: "إعلان الصباح",
        text: "يعلن التطبيق من مات الليلة، أو أن أحدًا لم يمت.",
      },
      {
        icon: <MessagesSquare className={ic} />,
        title: "أسئلة عشوائية",
        text: "يختار التطبيق أزواجًا من الأحياء: الأول يسأل والثاني يجيب، والكل يشاهد في الشات العام.",
      },
    ],
  },
  {
    id: "vote",
    label: "التصويت",
    icon: <Vote className="h-4 w-4" />,
    lead: "وقت الحسم: من تشك فيه؟",
    items: [
      {
        icon: <Megaphone className={ic} />,
        title: "اتهامات قصيرة",
        text: "كل لاعب يعرض شكوكه في وقت محدد.",
      },
      {
        icon: <Vote className={ic} />,
        title: "تصويت سري",
        text: "الأكثر أصواتًا يُطرد من اللعبة.",
      },
    ],
  },
  {
    id: "win",
    label: "الفوز",
    icon: <Trophy className="h-4 w-4" />,
    lead: "تنتهي اللعبة عندما يتحقق أحد الشرطين:",
    items: [
      {
        icon: <ShieldCheck className={ic} />,
        title: "فوز المواطنين",
        text: "القضاء على كل أفراد المافيا.",
        tone: "town",
      },
      {
        icon: <Skull className={ic} />,
        title: "فوز المافيا",
        text: "أن يتساوى عددهم مع باقي الأحياء أو يزيد.",
        tone: "mafia",
      },
    ],
  },
];

const toneText: Record<Tone, string> = {
  town: "text-[var(--town)]",
  mafia: "text-[var(--mafia,var(--accent))]",
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0";

export default function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // في RTL السهم الشمال = التالي
      if (e.key === "ArrowLeft") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowRight") setStep((s) => Math.max(0, s - 1));
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="كيف تلعب؟"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[var(--bg-2)] md:rounded-3xl"
      >
        {/* الهيدر */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5 md:px-6 md:pt-6">
          <h2 className="text-xl font-extrabold text-[var(--gold)]">كيف تلعب؟</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 ${focusRing}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* القاعدة الأهم */}
        <div className="mx-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 md:mx-6">
          <VolumeX className="h-5 w-5 shrink-0 text-[var(--text-1)]" />
          <p className="text-sm leading-relaxed text-[var(--text-1)]">
            <b className="text-[var(--text-0)]">اللعبة بصمت تام.</b> التطبيق هو الراوي والحكم،
            ويرسل لكل لاعب ما يخصه فقط.
          </p>
        </div>

        {/* المراحل */}
        <div
          role="tablist"
          aria-label="مراحل اللعبة"
          className="mx-5 mt-4 grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 md:mx-6"
        >
          {STEPS.map((s, i) => {
            const active = i === step;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => setStep(i)}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors duration-200 ${focusRing} ${
                  active
                    ? "bg-white text-black"
                    : i < step
                      ? "text-[var(--text-0)] hover:bg-white/[0.06]"
                      : "text-[var(--text-1)] hover:bg-white/[0.06]"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* محتوى المرحلة */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 pt-4 md:px-6">
          <div key={current.id} role="tabpanel" className="animate-fade-in-up min-h-[15.5rem]">
            <p className="mb-3 text-sm leading-relaxed text-[var(--text-1)]">{current.lead}</p>
            <ul className="flex flex-col gap-2.5">
              {current.items.map((it) => (
                <li
                  key={it.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${
                      it.tone ? toneText[it.tone] : "text-[var(--text-0)]"
                    }`}
                  >
                    {it.icon}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold ${it.tone ? toneText[it.tone] : "text-[var(--text-0)]"}`}
                    >
                      {it.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-[var(--text-1)]">
                      {it.text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* التنقل */}
        <div className="flex items-center gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            aria-label="السابق"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] transition-all hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30 ${focusRing}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98] ${focusRing}`}
          >
            {isLast ? (
              "فهمت، يلا نلعب"
            ) : (
              <>
                التالي
                <ChevronLeft className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}