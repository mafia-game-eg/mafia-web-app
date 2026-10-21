"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "mafia_splash_seen"; // sessionStorage: مرة لكل فتح للتطبيق/التبويب
const MAX_MS = 6000; // أمان: لو الفيديو ما اشتغلش أو وقف، نكمل بعد 6 ثواني

// بيتحط في layout.tsx فبيظهر مرة واحدة بس عند فتح التطبيق (الـ layout مش بيتعاد تحميله مع التنقل)
export default function SplashScreen() {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">("playing");
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);
  const decidedRef = useRef<"skip" | "play" | null>(null);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("leaving");
    window.setTimeout(() => setPhase("done"), 500);
  }

  useEffect(() => {
    // القرار بيتاخد مرة واحدة (مهم عشان StrictMode في التطوير بيشغّل الـ effect مرتين)
    if (decidedRef.current === null) {
      // /?splash=1 بيجبر الـ splash تظهر (للتجربة)
      const force = new URLSearchParams(window.location.search).has("splash");
      let seen = false;
      try {
        seen = sessionStorage.getItem(SEEN_KEY) === "1";
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* التخزين غير متاح: نكمل عادي */
      }
      decidedRef.current = !force && seen ? "skip" : "play";
    }

    if (decidedRef.current === "skip") {
      finishedRef.current = true;
      setPhase("done");
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(finish, MAX_MS);
    videoRef.current?.play().catch(finish); // لو المتصفح منع التشغيل التلقائي

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لما الـ splash يخلص نرجّع scroll الصفحة
  useEffect(() => {
    if (phase === "done") document.body.style.overflow = "";
  }, [phase]);

  if (phase === "done") return null;

  // الخلفية سودا ثابتة في الثيمين (ألوان hex عشان ما تنقلبش في الثيم الفاتح).
  // الكلاس [html[data-splash=seen]_&]:hidden بيخفيها قبل أول رسم لو اتشافت في نفس الجلسة.
  return (
    <div
      role="status"
      aria-label="جارِ التحميل"
      onClick={finish}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#000000] transition-opacity duration-500 [html[data-splash=seen]_&]:hidden ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={finish}
        onError={finish}
        className="h-full w-full scale-150 object-contain md:scale-100"
      >
        <source src="/splash.mp4" type="video/mp4" />
      </video>
    </div>
  );
}