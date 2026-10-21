"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/mafia/HeroCarousel";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  DoorOpen,
  Home,
  Loader2,
  MessagesSquare,
  ShieldCheck,
  Skull,
  Smartphone,
  Sparkles,
  Users,
  Vote,
  VolumeX,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { getLastName, listSessions, saveSession } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import ImageButton from "@/components/mafia/ImageButton";
import TeamSplit from "@/components/mafia/TeamSplit";
import { getComposition } from "@/lib/mafia/composition";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

type Mode = "home" | "create" | "join";

const NAME_REQUIRED_MSG = "اكتب اسمك أولًا من الصورة الشخصية أعلى الشاشة.";

export default function HomeClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [revealRoleOnDeath, setRevealRoleOnDeath] = useState(false);
  const [questionPairs, setQuestionPairs] = useState(3);
  const [revoteOnTie, setRevoteOnTie] = useState(true);
  const [extraRoleType, setExtraRoleType] = useState<"bodyguard" | "sniper">("bodyguard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);
  const comp = getComposition(maxPlayers);
  const [activeRoom, setActiveRoom] = useState<{ roomCode: string; phase: string } | null>(null);
  useEffect(() => {
    const p = loadProfile();
    setName(p.name || getLastName());
  }, []);

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

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError(NAME_REQUIRED_MSG);
      return;
    }
    setLoading(true);
    const avatar = await shrinkAvatar(loadProfile().avatar);
    const res = await api.create({
      playerName: name.trim(),
      avatar,
      maxPlayers,
      revealRoleOnDeath,
      questionPairs,
      revoteOnTie,
      extraRoleType,
    });
    setLoading(false);
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
  }

  async function handleJoin() {
    setError("");
    if (!name.trim()) {
      setError(NAME_REQUIRED_MSG);
      return;
    }
    if (!roomCode.trim()) {
      setError("اكتب كود الغرفة من فضلك.");
      return;
    }
    setLoading(true);
    const avatar = await shrinkAvatar(loadProfile().avatar);
    const res = await api.join({
      roomCode: roomCode.trim().toUpperCase(),
      playerName: name.trim(),
      avatar,
    });
    setLoading(false);
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
  }

  const primaryBtn =
    "flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-black shadow-md shadow-white/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-lg hover:shadow-white/15 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const goldBtn =
    "flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-4 text-lg font-bold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const backBtn =
    "flex items-center justify-center gap-1.5 py-1 text-sm text-[var(--text-1)] transition-colors duration-200 hover:text-white";

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-[var(--bg-0)] px-4 py-3 outline-none transition-all duration-200 focus:border-white/60 focus:bg-[var(--bg-0)] focus:ring-2 focus:ring-white/20";

  const settingRow =
    "flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.06]";
  return (
    <>
    <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={(p) => setName(p.name)} />
    <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col justify-center px-5 py-6" dir="rtl">
      {activeRoom && (
        <button
          onClick={() => router.push(`/room/${activeRoom.roomCode}`)}
          className="flex animate-fade-in-up items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--bg-1)] px-4 py-3 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
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
      <div className="animate-fade-in-up text-center">
        <h1 className="sr-only">المافيا</h1>
        <HeroCarousel />
      </div>
      {mode === "home" && (
        <TeamSplit town={11} mafia={3} label="التشكيلة المثالية · 14 لاعب" />
      )}

      {mode === "home" && (
        <div className="mt-4 grid animate-fade-in-up grid-cols-2 gap-3">
          <ImageButton
            title="إنشاء غرفة"
            subtitle="ابدأ لعبة جديدة"
            icon={<Home strokeWidth={2} />}
            plus
            onClick={() => setMode("create")}
          />
          <ImageButton
            title="دخول غرفة"
            subtitle="معاك كود الغرفة؟"
            icon={<DoorOpen strokeWidth={2} />}
            onClick={() => setMode("join")}
          />
        </div>
      )}

      {mode !== "home" && (
        <div className="mt-4 animate-fade-in-up rounded-3xl border border-white/10 bg-[var(--bg-1)] p-5 shadow-sm backdrop-blur">
          {mode === "create" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-1)]">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    عدد اللاعبين الأقصى
                  </span>
                  <span className="font-bold text-[var(--gold)]">{maxPlayers}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-white"
                />
                <div className="mt-3">
                  <TeamSplit town={comp.town} mafia={comp.mafia} label="التوزيع عند اكتمال العدد" />
                </div>
              </div>

              <div className={settingRow}>
                <span className="flex items-center gap-2 text-sm">
                  <Skull className="h-4 w-4 text-[var(--text-1)]" />
                  إظهار دور الميت بعد موته ليلًا
                </span>
                <input
                  type="checkbox"
                  checked={revealRoleOnDeath}
                  onChange={(e) => setRevealRoleOnDeath(e.target.checked)}
                  className="h-5 w-5 accent-white"
                />
              </div>

              <div className={settingRow}>
                <span className="flex items-center gap-2 text-sm">
                  <Vote className="h-4 w-4 text-[var(--text-1)]" />
                  إعادة تصويت عند التعادل
                </span>
                <input
                  type="checkbox"
                  checked={revoteOnTie}
                  onChange={(e) => setRevoteOnTie(e.target.checked)}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-1)]">
                  <span className="flex items-center gap-1.5">
                    <MessagesSquare className="h-4 w-4" />
                    عدد أزواج الأسئلة بكل نهار
                  </span>
                  <span className="font-bold text-white">{questionPairs}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={questionPairs}
                  onChange={(e) => setQuestionPairs(Number(e.target.value))}
                  className="w-full accent-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--text-1)]">
                  الدور الإضافي (يُفعَّل تلقائيًا من 10 لاعبين)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExtraRoleType("bodyguard")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 active:scale-95 ${
                      extraRoleType === "bodyguard"
                        ? "border-white bg-white/15 text-white"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    حارس شخصي
                  </button>
                  <button
                    onClick={() => setExtraRoleType("sniper")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 active:scale-95 ${
                      extraRoleType === "sniper"
                        ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Crosshair className="h-4 w-4" />
                    قناص
                  </button>
                </div>
              </div>

              <button disabled={loading} onClick={handleCreate} className={`mt-2 ${primaryBtn}`}>
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
              <button onClick={() => { setMode("home"); setError(""); }} className={backBtn}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="flex flex-col gap-3">
              <label className="mb-1 block text-xs text-[var(--text-1)]">كود الغرفة</label>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                placeholder="XXXXX"
                className={`${inputBase} text-center text-2xl font-extrabold tracking-[0.4em]`}
              />
              <button disabled={loading} onClick={handleJoin} className={`mt-2 ${goldBtn}`}>
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
              <button onClick={() => { setMode("home"); setError(""); }} className={backBtn}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 animate-fade-in-up rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="mt-auto flex items-center justify-center gap-5 pt-6 text-[11px] text-[var(--text-1)]">
        <li className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          من 5 لاعبين
        </li>
        <li className="flex items-center gap-1.5">
          <VolumeX className="h-3.5 w-3.5" />
          بصمت تام
        </li>
        <li className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" />
          من موبايلك
        </li>
      </ul>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </main>
    </>
  );
}