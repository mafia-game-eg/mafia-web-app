"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

const slides = [
  { src: "/slides/1.png", alt: "صورة 1" },
  { src: "/slides/2.png", alt: "صورة 2" },
  { src: "/slides/3.png", alt: "صورة 3" },
  { src: "/slides/4.png", alt: "صورة 4" },
  { src: "/slides/5.png", alt: "صورة 5" },
  { src: "/slides/6.png", alt: "صورة 6" },
  { src: "/slides/7.png", alt: "صورة 7" },
  { src: "/slides/8.png", alt: "صورة 8" },
  { src: "/slides/9.png", alt: "صورة 9" },
];

// نسخة من أول صورة في آخر الشريط عشان اللوب يبقى سلس
const loopSlides = [...slides, slides[0]];

export default function HeroCarousel({ interval = 3500 }: { interval?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);

  // بنحرّك الشريط نفسه بس (مش الصفحة كلها) — scrollIntoView كان بيسحب الصفحة لتحت
  // لو الكاروسيل ظاهر جزئيًا، وده بيبوّظ تجربة السكرول على الديسكتوب.
  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    const el = track?.children[i] as HTMLElement | undefined;
    if (!track || !el) return;
    const t = track.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (t.left + t.width / 2); // شغال في RTL و LTR
    track.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  // يعرف الصورة الظاهرة حاليًا (سواء اتحركت لوحدها أو بالسحب)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const index = Number((e.target as HTMLElement).dataset.index);
            setActive(index % slides.length);
          }
        });
      },
      { root: track, threshold: 0.6 }
    );
    Array.from(track.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  // الحركة التلقائية (بتقف لو التاب مش ظاهر)
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      goTo(active + 1);
    }, interval);
    return () => clearInterval(id);
  }, [active, goTo, interval]);

  useEffect(() => {
    return () => {
      clearTimeout(resumeTimer.current);
      clearTimeout(settleTimer.current);
    };
  }, []);

  // لما السكرول يهدى: لو وقفنا على النسخة، نقفز للأولى الحقيقية فورًا
  const handleScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track || draggingRef.current) return;
      const index = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
      if (index >= slides.length) {
        track.scrollTo({ left: 0, behavior: "instant" });
      }
    }, 120);
  };

  const pause = () => {
    pausedRef.current = true;
    clearTimeout(resumeTimer.current);
  };
  const resume = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false;
    }, 3000);
  };

  // ---------- السحب بالماوس (اللمس شغال تلقائيًا) ----------
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pause();
    if (e.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    startScrollRef.current = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = startScrollRef.current - (e.clientX - startXRef.current);
  };

  const endDrag = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
      const track = trackRef.current;
      if (track) {
        // بعد ما يسيب الماوس: نثبّت على أقرب صورة
        const index = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
        goTo(Math.min(index, loopSlides.length - 1));
      }
    }
    resume();
  };

  return (
    <div onMouseEnter={pause} onMouseLeave={resume}>
      <div
        ref={trackRef}
        dir="rtl"
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging
            ? "cursor-grabbing snap-none scroll-auto"
            : "cursor-grab snap-x snap-mandatory scroll-smooth"
        }`}
      >
        {loopSlides.map((s, i) => (
          <div key={`${s.src}-${i}`} data-index={i} className="w-full shrink-0 snap-center px-1 sm:px-3">
            <Image
              src={s.src}
              alt={s.alt}
              width={1800}
              height={780}
              priority={i === 0}
              draggable={false}
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 512px, 100vw"
              className="slide-card mx-auto h-auto w-full max-w-md select-none object-cover md:max-w-lg lg:max-w-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex justify-center" role="group" aria-label="اختيار الصورة">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`الصورة ${i + 1}`}
            aria-current={i === active}
            className="group flex h-6 items-center justify-center px-[3px] focus-visible:outline-none"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-white/60 ${
                i === active ? "w-5 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}