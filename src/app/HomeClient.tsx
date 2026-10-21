"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/mafia/HeroCarousel";
import { useRouter } from "next/navigation";

import { ArrowLeft, DoorOpen, Home } from "lucide-react";
import { api } from "@/lib/client/api";
import { listSessions } from "@/lib/client/storage";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Navbar from "@/components/mafia/Navbar";
import ImageButton from "@/components/mafia/ImageButton";
import TeamSplit from "@/components/mafia/TeamSplit";

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
      <Navbar onOpenHowTo={() => setShowHowTo(true)} onProfileChange={() => {}} />
      <main
        className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col gap-5 px-5 pb-8 pt-3"
        dir="rtl"
      >
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
          {/* الهامش السالب يخلي الكاروسيل يطلع بنفس عرض الخط اللي تحته */}
          <div className="-mx-2.5">
            <HeroCarousel />
          </div>
        </div>

        <div className="animate-fade-in-up">
          <TeamSplit town={11} mafia={3} label="التشكيلة المثالية · 14 لاعب" />
        </div>

        <div className="grid animate-fade-in-up grid-cols-2 gap-3">
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

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </main>
    </>
  );
}