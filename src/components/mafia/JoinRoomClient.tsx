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

  const goldBtn =
    "flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-4 text-lg font-bold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

  const backBtn =
    "flex items-center justify-center gap-1.5 py-1 text-sm text-[var(--text-1)] transition-colors duration-200 hover:text-white";

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-[var(--bg-0)] px-4 py-3 outline-none transition-all duration-200 focus:border-white/60 focus:bg-[var(--bg-0)] focus:ring-2 focus:ring-white/20";

  return (
    <>
      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={(p) => setName(p.name)} />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pb-8 pt-4" dir="rtl">
        <header className="flex animate-fade-in-up items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[var(--bg-1)]">
            <DoorOpen className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold">دخول غرفة</h1>
            <p className="text-xs text-[var(--text-1)]">اكتب الكود اللي وصلك من صاحب الغرفة</p>
          </div>
        </header>

        <div className="animate-fade-in-up rounded-3xl border border-white/10 bg-[var(--bg-1)] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3">
            <label className="mb-1 block text-xs text-[var(--text-1)]">كود الغرفة</label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="XXXXX"
              autoFocus
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
            <button onClick={() => router.push("/")} className={backBtn}>
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </div>
        </div>

        {error && (
          <p className="animate-fade-in-up rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}