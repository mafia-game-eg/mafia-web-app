"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/mafia/HeroCarousel";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleHelp,
  Crosshair,
  DoorOpen,
  Home,
  Loader2,
  MessagesSquare,
  ShieldCheck,
  Skull,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { getLastName, saveSession } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

type Mode = "home" | "create" | "join";

export default function HomeClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [revealRoleOnDeath, setRevealRoleOnDeath] = useState(false);
  const [questionPairs, setQuestionPairs] = useState(3);
  const [revoteOnTie, setRevoteOnTie] = useState(true);
  const [extraRoleType, setExtraRoleType] = useState<"bodyguard" | "sniper">("bodyguard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    setName(loadProfile().name || getLastName());
  }, []);

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError("اكتب اسمك أولًا من فضلك.");
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
      setError("اكتب اسمك أولًا من فضلك.");
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
    "flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-black shadow-lg shadow-white/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl hover:shadow-white/20 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const goldBtn =
    "flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-4 py-4 text-lg font-bold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const backBtn =
    "flex items-center justify-center gap-1.5 py-1 text-sm text-[var(--text-1)] transition-colors duration-200 hover:text-white";

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 outline-none transition-all duration-200 focus:border-white/60 focus:bg-black/60 focus:ring-2 focus:ring-white/20";

  const settingRow =
    "flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.06]";
  return (
    <>
    <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={(p) => setName(p.name)} />
    <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col justify-center px-5 py-6" dir="rtl">
      <div className="animate-fade-in-up text-center">
        <h1 className="sr-only">المافيا</h1>
        <HeroCarousel />
      </div>

      <div className="mt-6 animate-fade-in-up rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur">
        <label className="mb-1.5 block text-xs text-[var(--text-1)]">اسمك</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="اكتب اسمك هنا..."
          className={`${inputBase} text-base placeholder:text-[var(--text-1)]/60`}
        />

        {mode === "home" && (
          <div className="mt-5 flex animate-fade-in-up flex-col gap-3">
            <button onClick={() => setMode("create")} className={primaryBtn}>
              <Home className="h-5 w-5" strokeWidth={2.2} />
              إنشاء غرفة
            </button>
            <button onClick={() => setMode("join")} className={goldBtn}>
              <DoorOpen className="h-5 w-5" strokeWidth={2.2} />
              دخول غرفة
            </button>
            <button
              onClick={() => setShowHowTo(true)}
              className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[var(--text-1)] underline underline-offset-4 transition-colors duration-200 hover:text-white"
            >
              <CircleHelp className="h-4 w-4" />
              كيف تلعب؟
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="mt-5 flex animate-fade-in-up flex-col gap-4">
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
            <button onClick={() => setMode("home")} className={backBtn}>
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="mt-5 flex animate-fade-in-up flex-col gap-3">
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
            <button onClick={() => setMode("home")} className={backBtn}>
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 animate-fade-in-up rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--text-1)]/70">
        يُفضَّل اللعب من 5 لاعبين فأكثر، والتطبيق هو من يتحكم في كل شيء ليبقى اللعب عادلًا.
      </p>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </main>
    </>
  );
}