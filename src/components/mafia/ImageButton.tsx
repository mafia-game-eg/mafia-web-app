"use client";

import Image from "next/image";
import { ChevronLeft, Plus } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode; // أيقونة lucide بدون className (الحجم بيتظبط تلقائيًا)
  plus?: boolean; // علامة + صغيرة على الدايرة (للإنشاء)
  image?: string; // اختياري: لو عايز تحط صورة جاهزة بدل التصميم (بتغطي الزرار كله)
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

// ملاحظة: الكارت أسود ثابت في الثيمين (زي صور الكاروسيل)، فالألوان hex مش white/black
// عشان ما تنقلبش في الثيم الفاتح. الأحجام بـ cqw (نسبة من عرض الكارت) فبتتظبط على أي موبايل.
export default function ImageButton({
  title,
  subtitle,
  icon,
  plus,
  image,
  onClick,
  disabled,
  ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? title}
      className="@container relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#2a2a2e] bg-[#000000] text-right text-[#ffffff] shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none"
    >
      {image ? (
        <Image src={image} alt="" fill unoptimized sizes="50vw" className="object-cover" />
      ) : (
        <>
          {/* أول عنصر في RTL = اليمين: الدايرة يمين والنص جنبها (زي سلايد الولد الصالح) */}
          <span className="flex h-full items-center gap-[4cqw] px-[6cqw]">
            <span className="relative shrink-0" style={{ width: "32cqw", height: "32cqw" }}>
              <span className="flex h-full w-full items-center justify-center rounded-full border border-[#2a2a2e] p-[6%]">
                <span
                  className="flex h-full w-full items-center justify-center rounded-full bg-[#111114] text-[#ffffff]"
                  style={{ border: "max(2px, 0.9cqw) solid #ffffff" }}
                >
                  <span className="h-[52%] w-[52%] [&>svg]:h-full [&>svg]:w-full">{icon}</span>
                </span>
              </span>
              {plus && (
                <span className="absolute bottom-[2%] left-[2%] flex h-[34%] w-[34%] items-center justify-center rounded-full bg-[#ffffff] text-[#000000]">
                  <Plus className="h-[70%] w-[70%]" strokeWidth={3} />
                </span>
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col items-start gap-[1cqw]">
              <span
                className="whitespace-nowrap font-extrabold"
                style={{ fontSize: "8.5cqw", lineHeight: 1.2 }}
              >
                {title}
              </span>
              {subtitle && (
                <span
                  className="text-[#a1a1aa]"
                  style={{ fontSize: "max(10px, 5.8cqw)", lineHeight: 1.3 }}
                >
                  {subtitle}
                </span>
              )}
            </span>
          </span>
          <ChevronLeft
            className="absolute bottom-[5cqw] left-[4cqw] text-[#ffffff] opacity-60"
            style={{ width: "8cqw", height: "8cqw" }}
          />
        </>
      )}
    </button>
  );
}