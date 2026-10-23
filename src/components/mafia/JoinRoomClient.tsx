"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, DoorOpen, Loader2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { getLastName, saveSession } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

const NAME_REQUIRED_MSG = "اكتب اسمك أولًا من الصورة الشخصية أعلى الشاشة.";
const CODE_LENGTH = 5;

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0";

export default function JoinRoomClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setName(p.name || getLastName());
  }, []);

  async function handleJoin() {
    if (loading) return;
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
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-bold text-black shadow-md shadow-white/10 transition-all duration-200 ease-out hover:bg-white/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-[var(--bg-0)] px-4 py-3 outline-none transition-colors duration-200 focus:border-white/60 focus:ring-2 focus:ring-white/20";

  return (
    <>
      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={(p) => setName(p.name)} />

      {/* نفس عرض الـ Navbar: موبايل / تابلت / ديسكتوب */}
      <main
        className="mx-auto w-full max-w-md px-4 pb-8 pt-4 md:max-w-2xl md:px-6 md:pt-6 lg:max-w-5xl lg:px-8"
        dir="rtl"
      >
        <header className="flex animate-fade-in-up items-center gap-3">
          <button
            type="button"
            aria-label="رجوع"
            onClick={() => router.push("/")}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] transition-all duration-200 hover:bg-white/10 active:scale-90 ${focusRing}`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold md:text-2xl">دخول غرفة</h1>
            <p className="text-xs text-[var(--text-1)] md:text-sm">اكتب الكود اللي وصلك من صاحب الغرفة</p>
          </div>
        </header>

        {/* الكارت في النص على التابلت والديسكتوب */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoin();
          }}
          className="mx-auto mt-5 w-full max-w-md rounded-3xl border border-white/10 bg-[var(--bg-1)] p-5 md:mt-8 md:p-6"
        >
          <label htmlFor="room-code" className="mb-2 block text-xs text-[var(--text-1)]">
            كود الغرفة
          </label>
          <input
            id="room-code"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            dir="ltr"
            maxLength={CODE_LENGTH}
            placeholder="XXXXX"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={`${inputBase} text-center text-2xl font-extrabold tracking-[0.4em] md:text-3xl`}
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={`mt-4 ${primaryBtn}`}>
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

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}