"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Crosshair,
  ListChecks,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Skull,
  Sparkles,
  TriangleAlert,
  User,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { getLastName, saveSession } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import TeamSplit from "@/components/mafia/TeamSplit";
import { getComposition } from "@/lib/mafia/composition";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

const NAME_REQUIRED_MSG = "اكتب اسمك أولًا من الصورة الشخصية أعلى الشاشة.";
const NETWORK_ERROR_MSG = "حصلت مشكلة في الاتصال. اتأكد من النت وجرّب تاني.";
const STORAGE_KEY = "mafia:create-settings";
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 20;
const EXTRA_ROLE_FROM = 10;

type Profile = ReturnType<typeof loadProfile>;
type ExtraRole = "bodyguard" | "sniper";
type Settings = {
  maxPlayers: number;
  revealRoleOnDeath: boolean;
  questionPairs: number;
  revoteOnTie: boolean;
  extraRoleType: ExtraRole;
};

const DEFAULTS: Settings = {
  maxPlayers: 14,
  revealRoleOnDeath: false,
  questionPairs: 3,
  revoteOnTie: true,
  extraRoleType: "bodyguard",
};

const PRESETS: { id: string; title: string; desc: string; settings: Settings }[] = [
  {
    id: "quick",
    title: "سريعة",
    desc: "8 لاعبين",
    settings: { ...DEFAULTS, maxPlayers: 8, questionPairs: 2 },
  },
  {
    id: "classic",
    title: "كلاسيك",
    desc: "14 لاعب",
    settings: { ...DEFAULTS },
  },
  {
    id: "big",
    title: "كبيرة",
    desc: "18 لاعب",
    settings: { ...DEFAULTS, maxPlayers: 18, questionPairs: 4 },
  },
];

const EXTRA_ROLES: { id: ExtraRole; title: string; desc: string; icon: ReactNode }[] = [
  {
    id: "bodyguard",
    title: "حارس شخصي",
    desc: "يحمي لاعبًا من القتل",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    id: "sniper",
    title: "قناص",
    desc: "يضرب بدقة ويغيّر مجرى اللعبة",
    icon: <Crosshair className="h-5 w-5" />,
  },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function sameSettings(a: Settings, b: Settings) {
  return (
    a.maxPlayers === b.maxPlayers &&
    a.revealRoleOnDeath === b.revealRoleOnDeath &&
    a.questionPairs === b.questionPairs &&
    a.revoteOnTie === b.revoteOnTie &&
    a.extraRoleType === b.extraRoleType
  );
}

function sizeHint(n: number) {
  if (n < 8) return "لعبة سريعة وهادية";
  if (n < 14) return "مناسبة لتجمع عادي";
  if (n === 14) return "التشكيلة المثالية";
  return "لعبة كبيرة وأطول";
}

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0";

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

/* ---------- مكونات صغيرة ---------- */

function Section({
  icon,
  title,
  aside,
  children,
}: {
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--bg-1)] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold md:text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--text-1)]">
            {icon}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic();
        onChange(!checked);
      }}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-right transition-colors duration-200 active:scale-[0.99] ${focusRing} ${
        checked ? "border-white/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <span className="text-[var(--text-1)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-1)]">{desc}</span>
      </span>
      <span
        dir="ltr"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-white" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-all duration-200 ${
            checked ? "translate-x-5 bg-black" : "translate-x-0 bg-white/70"
          }`}
        />
      </span>
    </button>
  );
}

function RoundBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] transition-all duration-200 hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-30 ${focusRing}`}
    >
      {children}
    </button>
  );
}

/* ---------- الصفحة ---------- */

export default function CreateRoomClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Profile["avatar"]>();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);

  const comp = getComposition(s.maxPlayers);
  const update = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));
  const extraActive = s.maxPlayers >= EXTRA_ROLE_FROM;
  const activePreset = PRESETS.find((p) => sameSettings(p.settings, s));

  // الاسم + الصورة + آخر إعدادات استخدمتها
  useEffect(() => {
    const p = loadProfile();
    setName(p.name || getLastName());
    setAvatar(p.avatar);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setS({
          maxPlayers: clamp(Number(saved.maxPlayers) || DEFAULTS.maxPlayers, MIN_PLAYERS, MAX_PLAYERS),
          revealRoleOnDeath: Boolean(saved.revealRoleOnDeath),
          questionPairs: clamp(Number(saved.questionPairs) || DEFAULTS.questionPairs, 1, 6),
          revoteOnTie: saved.revoteOnTie !== false,
          extraRoleType: saved.extraRoleType === "sniper" ? "sniper" : "bodyguard",
        });
      }
    } catch {
      /* تجاهل */
    }
    setReady(true);
  }, []);

  // حفظ الإعدادات عشان المرة الجاية تلاقيها زي ما سبتها
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* تجاهل */
    }
  }, [s, ready]);

  async function handleCreate() {
    if (loading) return;
    setError("");
    haptic();
    if (!name.trim()) {
      setError(NAME_REQUIRED_MSG);
      return;
    }
    setLoading(true);
    try {
      const av = await shrinkAvatar(loadProfile().avatar);
      const res = await api.create({
        playerName: name.trim(),
        avatar: av,
        maxPlayers: s.maxPlayers,
        revealRoleOnDeath: s.revealRoleOnDeath,
        questionPairs: s.questionPairs,
        revoteOnTie: s.revoteOnTie,
        extraRoleType: s.extraRoleType,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      saveSession({
        roomCode: res.roomCode,
        playerId: res.playerId,
        token: res.token,
        name: name.trim(),
      });
      router.push(`/room/${res.roomCode}`);
    } catch {
      // النت واقف أو السيرفر مردوش — نعرض رسالة ونرجّع الزرار بدل ما يفضل عايق
      setError(NETWORK_ERROR_MSG);
    } finally {
      setLoading(false);
    }
  }

  const primaryBtn =
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-black transition-all duration-200 ease-out hover:bg-white/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  return (
    <>
      <style>{`
        /* الحركات المتدرجة تاخد fill-mode: both عشان مفيش وميض قبل ما الحركة تبدأ */
        .mf-stagger { animation-fill-mode: both; }
        /* احترام تقليل الحركة للمستخدمين اللي بيفضلوا كده */
        @media (prefers-reduced-motion: reduce) {
          main *, main *::before, main *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <Navbar
        onOpenHowTo={() => setShowHowTo(true)}
        onProfileChange={(p) => {
          setName(p.name);
          setAvatar(p.avatar);
        }}
      />

      {/* موبايل: عمود واحد | تابلت: عمود أعرض | ديسكتوب: عمودين */}
      <main
        className="mx-auto w-full max-w-md px-4 pb-6 pt-4 md:max-w-2xl md:px-6 md:pt-6 lg:max-w-5xl lg:px-8"
        dir="rtl"
      >
        {/* الهيدر */}
        <header className="mf-stagger flex animate-fade-in-up items-center gap-3" style={stagger(0)}>
          <button
            type="button"
            aria-label="رجوع"
            onClick={() => router.push("/")}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] transition-all duration-200 hover:bg-white/10 active:scale-90 ${focusRing}`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold md:text-2xl">إنشاء غرفة</h1>
            <p className="text-xs text-[var(--text-1)] md:text-sm">اضبط القواعد وادعُ أصحابك</p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:mt-6 lg:grid-cols-2 lg:items-start lg:gap-6">
          {/* العمود الأول: المضيف + اللاعبين (الأنماط مدموجة جواه) */}
          <div className="flex flex-col gap-4">
            {/* كارت المضيف */}
            <div
              className={`mf-stagger flex animate-fade-in-up items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                name.trim() ? "border-white/10 bg-[var(--bg-1)]" : "border-red-400/30 bg-red-500/10"
              }`}
              style={stagger(1)}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
                {typeof avatar === "string" && avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-[var(--text-1)]" />
                )}
              </span>
              {name.trim() ? (
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-[var(--text-1)]">أنت مضيف الغرفة</span>
                  <span className="block truncate text-base font-bold">{name.trim()}</span>
                </span>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-red-300">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  اكتب اسمك من الصورة الشخصية أعلى الشاشة
                </span>
              )}
            </div>

            {/* اللاعبون: العدد + الأنماط الجاهزة + التوزيع */}
            <section
              className="mf-stagger animate-fade-in-up rounded-3xl border border-white/10 bg-[var(--bg-1)] p-4 md:p-5"
              style={stagger(2)}
            >
              <div className="mb-4 flex items-center gap-2.5">
                <h2 className="flex items-center gap-2.5 text-sm font-bold md:text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--text-1)]">
                    <Users className="h-4 w-4" />
                  </span>
                  عدد اللاعبين
                </h2>
              </div>

              {/* أنماط جاهزة — صف مدموج بدل قسم كامل */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-1)]">
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  أنماط جاهزة
                  {activePreset && <span className="font-normal">· مفعّل: {activePreset.title}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => {
                    const active = activePreset?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          haptic();
                          setS(p.settings);
                        }}
                        className={`rounded-xl border px-2 py-2 text-center transition-colors duration-200 active:scale-95 ${focusRing} ${
                          active
                            ? "border-white bg-white/15"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                        }`}
                      >
                        <span className="block text-[13px] font-bold">{p.title}</span>
                        <span className="block text-[10px] text-[var(--text-1)]">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <RoundBtn
                    label="زيادة العدد"
                    onClick={() => update({ maxPlayers: Math.min(MAX_PLAYERS, s.maxPlayers + 1) })}
                    disabled={s.maxPlayers >= MAX_PLAYERS}
                  >
                    <Plus className="h-5 w-5" />
                  </RoundBtn>
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-5xl font-extrabold leading-none tabular-nums text-[var(--gold)] md:text-6xl">
                        {s.maxPlayers}
                      </span>
                      <span className="text-sm text-[var(--text-1)]">لاعب</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--text-1)]">{sizeHint(s.maxPlayers)}</p>
                  </div>
                  <RoundBtn
                    label="تقليل العدد"
                    onClick={() => update({ maxPlayers: Math.max(MIN_PLAYERS, s.maxPlayers - 1) })}
                    disabled={s.maxPlayers <= MIN_PLAYERS}
                  >
                    <Minus className="h-5 w-5" />
                  </RoundBtn>
                </div>

                <input
                  type="range"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={s.maxPlayers}
                  onChange={(e) => update({ maxPlayers: Number(e.target.value) })}
                  aria-label="عدد اللاعبين الأقصى"
                  className="mt-4 w-full accent-white"
                />
                <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--text-1)]" aria-hidden="true">
                  <span>{MIN_PLAYERS}</span>
                  <span>{MAX_PLAYERS}</span>
                </div>

                <div className="mt-4">
                  <TeamSplit town={comp.town} mafia={comp.mafia} label="التوزيع عند اكتمال العدد" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--text-1)]">
                  اللعبة تبدأ بمن حضر، والعدد ده هو الحد الأقصى للي يقدر يدخل الغرفة.
                </p>
              </div>
            </section>
          </div>

          {/* العمود التاني: القواعد + الدور الإضافي + زرار الإنشاء */}
          <div className="flex flex-col gap-4">
            {/* القواعد */}
            <div className="mf-stagger animate-fade-in-up" style={stagger(3)}>
            <Section icon={<ListChecks className="h-4 w-4" />} title="قواعد اللعبة">
              <div className="flex flex-col gap-2.5">
                <ToggleRow
                  icon={<Vote className="h-5 w-5" />}
                  title="إعادة تصويت عند التعادل"
                  desc="لو تعادل التصويت، يتعاد مرة تانية بدل ما ينتهي النهار بدون قرار."
                  checked={s.revoteOnTie}
                  onChange={(v) => update({ revoteOnTie: v })}
                />
                <ToggleRow
                  icon={<Skull className="h-5 w-5" />}
                  title="إظهار دور الميت بعد موته"
                  desc="لو شغّلته، دور اللاعب يظهر للكل أول ما يخرج من اللعبة."
                  checked={s.revealRoleOnDeath}
                  onChange={(v) => update({ revealRoleOnDeath: v })}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold">أزواج الأسئلة بكل نهار</span>
                  <span className="text-xs text-[var(--text-1)]">{s.questionPairs} من 6</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 md:gap-2" role="radiogroup" aria-label="عدد أزواج الأسئلة">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={s.questionPairs === n}
                      onClick={() => {
                        haptic();
                        update({ questionPairs: n });
                      }}
                      className={`rounded-xl border py-2.5 text-sm font-bold tabular-nums transition-colors duration-200 active:scale-90 ${focusRing} ${
                        s.questionPairs === n
                          ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                          : "border-white/10 bg-white/[0.03] text-[var(--text-1)] hover:bg-white/[0.07]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
            </div>

            {/* الدور الإضافي */}
            <div className="mf-stagger animate-fade-in-up" style={stagger(4)}>
            <Section
              icon={<ShieldCheck className="h-4 w-4" />}
              title="الدور الإضافي"
              aside={
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    extraActive
                      ? "border-[var(--town)]/40 text-[var(--town)]"
                      : "border-white/15 text-[var(--text-1)]"
                  }`}
                >
                  {extraActive ? "مفعّل" : `من ${EXTRA_ROLE_FROM} لاعبين`}
                </span>
              }
            >
              <div
                className={`grid grid-cols-2 gap-2.5 transition-opacity duration-200 md:gap-3 ${
                  extraActive ? "" : "opacity-50"
                }`}
                role="radiogroup"
                aria-label="الدور الإضافي"
              >
                {EXTRA_ROLES.map((r) => {
                  const active = s.extraRoleType === r.id;
                  const isSniper = r.id === "sniper";
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={!extraActive}
                      onClick={() => {
                        if (!extraActive) return; // مقفول لحد ما العدد يوصل للحد المطلوب
                        haptic();
                        update({ extraRoleType: r.id });
                      }}
                      className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-right transition-colors duration-200 active:scale-[0.98] ${focusRing} ${
                        active
                          ? isSniper
                            ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                            : "border-white bg-white/15 text-white"
                          : extraActive
                            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                            : "cursor-not-allowed border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      {r.icon}
                      <span className="text-sm font-bold">{r.title}</span>
                      <span className="text-xs leading-relaxed text-[var(--text-1)]">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
            </div>

            {/* الإنشاء: ثابت تحت على الموبايل والتابلت، عادي في العمود على الديسكتوب */}
            <div className="mf-stagger sticky bottom-0 z-10 -mx-4 animate-fade-in-up bg-gradient-to-t from-[var(--bg-0)] via-[var(--bg-0)]/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-none lg:p-0" style={stagger(5)}>
              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300"
                >
                  {error}
                </p>
              )}
              <p className="mb-2.5 text-center text-xs text-[var(--text-1)]">
                {s.maxPlayers} لاعب · {comp.mafia} مافيا · {s.questionPairs} أزواج أسئلة
              </p>
              <button disabled={loading} onClick={handleCreate} className={primaryBtn}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جارِ الإنشاء...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    إنشاء الغرفة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}