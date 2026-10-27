"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, DoorOpen, Home, Plus, User, type LucideIcon } from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  primary?: boolean; // الزرار الأوسط البارز
};

type Props = {
  /** يفتح نافذة شرح اللعبة (لو متبعتش، الزرار مش بيظهر) */
  onOpenHowTo?: () => void;
  /** لو الملف الشخصي بيتفتح كنافذة من عندك */
  onOpenProfile?: () => void;
  /** أو رابط صفحة الملف الشخصي (لو مفيش onOpenProfile) */
  profileHref?: string;
};

// اهتزاز خفيف على الموبايل
function haptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  } catch {
    /* مش مدعوم */
  }
}

export default function BottomNav({ onOpenHowTo, onOpenProfile, profileHref }: Props) {
  const pathname = usePathname() ?? "/";

  // أثناء اللعبة نفسها الشاشة كلها للعب — مفيش شريط تنقل
  if (pathname.startsWith("/room")) return null;

  const items: NavItem[] = [
    { key: "home", label: "الرئيسية", icon: Home, href: "/" },
    { key: "join", label: "دخول", icon: DoorOpen, href: "/join" },
    { key: "create", label: "إنشاء", icon: Plus, href: "/create", primary: true },
  ];
  if (onOpenHowTo) items.push({ key: "howto", label: "الشرح", icon: BookOpen, onClick: onOpenHowTo });
  if (onOpenProfile || profileHref) {
    items.push({ key: "profile", label: "حسابي", icon: User, href: onOpenProfile ? undefined : profileHref, onClick: onOpenProfile });
  }

  const isActive = (it: NavItem) =>
    !!it.href && (it.href === "/" ? pathname === "/" : pathname.startsWith(it.href));

  return (
    <nav
      aria-label="التنقل الرئيسي"
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--bg-1)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <ul
        className="mx-auto grid h-16 max-w-md items-stretch px-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it);

          const inner = it.primary ? (
            <>
              <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a0a0a] text-[#fafafa] shadow-lg ring-4 ring-[var(--bg-1)] transition-transform duration-200 group-active:scale-90">
                <Icon className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className={`mt-1 text-[11px] font-bold ${active ? "text-white" : "text-[var(--text-1)]"}`}>
                {it.label}
              </span>
            </>
          ) : (
            <>
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
                  active ? "bg-white/[0.1] text-white" : "text-[var(--text-1)] group-active:bg-white/[0.06]"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              </span>
              <span
                className={`mt-0.5 text-[11px] ${active ? "font-bold text-white" : "font-medium text-[var(--text-1)]"}`}
              >
                {it.label}
              </span>
            </>
          );

          const cls =
            "group flex h-full w-full flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl";

          return (
            <li key={it.key} className="min-w-0">
              {it.href ? (
                <Link
                  href={it.href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  onClick={haptic}
                  className={cls}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    it.onClick?.();
                  }}
                  className={cls}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}