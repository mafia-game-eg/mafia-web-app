"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  Camera,
  Check,
  CircleHelp,
  LogOut,
  Mail,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import { fileToAvatar, loadProfile, saveProfile, type Profile } from "@/lib/client/profile";
import { isMuted, setMuted } from "@/lib/client/sound";

const WELCOME_KEY = "mafia-welcome-seen";
const MIN_USERNAME = 3;

export default function Navbar({
  onOpenHowTo,
  onProfileChange,
}: {
  onOpenHowTo: () => void;
  onProfileChange?: (p: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile>({ name: "", avatar: null });
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [muted, setMutedState] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setMutedState(isMuted());

    // الملف الشخصي الحقيقي من الداتا بيز
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const next: Profile = { name: data.username ?? "", avatar: data.avatar ?? null };
        saveProfile(next);
        setProfile(next);
        setEmail(data.email ?? "");
        onProfileChange?.(next);

        // رسالة الترحيب: لو اليوزر نيم لسه التلقائي ومشافهاش قبل كده
        try {
          const isAuto = /^player\d+$/.test(next.name);
          if (isAuto && localStorage.getItem(WELCOME_KEY) !== next.name) {
            setWelcomeOpen(true);
          }
        } catch {}
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // قفل سكرول الصفحة وإنت فاتح القايمة أو أي نافذة
  const anyOpen = menuOpen || profileOpen || welcomeOpen;
  useEffect(() => {
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyOpen]);

  function openProfile() {
    setDraftName(profile.name);
    setDraftAvatar(profile.avatar);
    setError("");
    setMenuOpen(false);
    setProfileOpen(true);
  }

  function closeWelcome() {
    try {
      localStorage.setItem(WELCOME_KEY, profile.name);
    } catch {}
    setWelcomeOpen(false);
  }

  function changeFromWelcome() {
    closeWelcome();
    openProfile();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختار صورة فقط من فضلك.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("الصورة كبيرة جدًا، اختار صورة أصغر من 10 ميجا.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setDraftAvatar(await fileToAvatar(file));
    } catch {
      setError("مقدرناش نقرأ الصورة دي، جرّب صورة تانية.");
    }
    setBusy(false);
  }

  async function saveDraft() {
    const name = draftName.trim().toLowerCase();
    if (name.length < MIN_USERNAME) {
      setError(`اليوزر نيم لازم يكون ${MIN_USERNAME} حروف على الأقل.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, avatar: draftAvatar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "حصلت مشكلة، جرّب تاني.");
        setBusy(false);
        return;
      }
      const next: Profile = { name, avatar: draftAvatar };
      saveProfile(next);
      setProfile(next);
      onProfileChange?.(next);
      setProfileOpen(false);
    } catch {
      setError("مفيش اتصال، جرّب تاني.");
    }
    setBusy(false);
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  const menuItem =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm text-[var(--text-0)] transition-colors hover:bg-white/5";

  const modalBackdrop =
    "fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm";
  const modalCard =
    "animate-fade-in-up my-auto w-full max-w-sm rounded-3xl border border-white/10 bg-[var(--bg-1)] p-5 shadow-2xl md:max-w-md md:p-6";

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 border-b border-white/10 bg-black/60 pt-[env(safe-area-inset-top)] backdrop-blur-md"
      >
        {/* نفس عرض الصفحات: موبايل / تابلت / ديسكتوب */}
        <div className="mx-auto grid h-16 max-w-md grid-cols-[1fr_auto_1fr] items-center px-4 md:h-20 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8">
          {/* في RTL أول عنصر بيطلع على اليمين: زرار القايمة */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 flex-col justify-center justify-self-start gap-[6px] rounded-lg text-[var(--text-0)] outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-white/50 active:opacity-60"
          >
            <span className="ml-auto block h-[2px] w-6 rounded-full bg-current" />
            <span className="ml-auto block h-[2px] w-4 rounded-full bg-current" />
            <span className="ml-auto block h-[2px] w-5 rounded-full bg-current" />
          </button>

          <div className="flex justify-center">
            <Image
              src="/logo-nav.png"
              alt="المافيا"
              width={480}
              height={120}
              priority
              className="logo-for-dark h-10 w-auto md:h-12"
            />
            <Image
              src="/logo-nav-dark.png"
              alt="المافيا"
              width={480}
              height={120}
              priority
              className="logo-for-light h-10 w-auto md:h-12"
            />
          </div>

          {/* آخر عنصر بيطلع على الشمال: صورة اللاعب */}
          <button
            onClick={openProfile}
            aria-label="الملف الشخصي"
            className="h-11 w-11 justify-self-end overflow-hidden rounded-full outline-none ring-1 ring-white/10 transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-white/50 active:scale-95"
          >
            <Avatar name={profile.name} src={profile.avatar} size={44} />
          </button>
        </div>
      </header>

      {/* القايمة الجانبية */}
      <div
        dir="rtl"
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-50 transition-[opacity,visibility] duration-300 ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <aside
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col overflow-y-auto border-l border-white/10 bg-[var(--bg-1)] p-5 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl transition-transform duration-300 ease-out md:w-80 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="font-bold text-[var(--gold)]">القائمة</span>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="إغلاق"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={openProfile}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-right transition-colors hover:bg-white/5"
          >
            <Avatar name={profile.name} src={profile.avatar} size={52} />
            <span className="min-w-0">
              <span className="block truncate font-bold" dir="ltr">
                {profile.name ? `@${profile.name}` : "لاعب جديد"}
              </span>
              <span className="text-xs text-[var(--text-1)]">تعديل الملف الشخصي</span>
            </span>
          </button>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenHowTo();
              }}
              className={menuItem}
            >
              <CircleHelp className="h-5 w-5 text-[var(--gold)]" />
              كيف تلعب؟
            </button>
            <button onClick={toggleSound} className={menuItem}>
              {muted ? (
                <VolumeX className="h-5 w-5 text-[var(--gold)]" />
              ) : (
                <Volume2 className="h-5 w-5 text-[var(--gold)]" />
              )}
              الصوت: {muted ? "مكتوم" : "شغّال"}
            </button>
            <ThemeToggle className={menuItem} />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className={`${menuItem} mt-2`}>
              <LogOut className="h-5 w-5 text-red-400" />
              تسجيل الخروج
            </button>
          </nav>
        </aside>
      </div>

      {/* نافذة الملف الشخصي */}
      {profileOpen && (
        <div dir="rtl" className={`${modalBackdrop} z-[60]`} onClick={() => setProfileOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className={modalCard}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--gold)]">الملف الشخصي</h2>
              <button
                onClick={() => setProfileOpen(false)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex flex-col items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="relative rounded-full"
                aria-label="تغيير الصورة"
              >
                <Avatar name={draftName} src={draftAvatar} size={104} />
                <span className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--accent)]">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              {draftAvatar && (
                <button
                  onClick={() => setDraftAvatar(null)}
                  className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف الصورة
                </button>
              )}
            </div>

            <label className="mb-1.5 block text-xs text-[var(--text-1)]">اليوزر نيم</label>
            <input
              value={draftName}
              onChange={(e) =>
                setDraftName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              dir="ltr"
              maxLength={20}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left outline-none transition focus:border-[var(--gold)]/60 focus:ring-2 focus:ring-[var(--gold)]/30"
            />
            <p className="mt-1.5 text-xs text-[var(--text-1)]/80">
              حروف إنجليزي صغيرة وأرقام و _ بس (من {MIN_USERNAME} لـ 20). أصحابك هيضيفوك بيه.
            </p>

            {email && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[var(--text-1)]">الإيميل (ظاهر ليك إنت بس)</label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-1)]">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate" dir="ltr">{email}</span>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              onClick={saveDraft}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-3.5 text-base font-bold shadow-lg shadow-red-900/30 transition-opacity disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              {busy ? "جارِ الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}

      {/* رسالة الترحيب أول مرة */}
      {welcomeOpen && (
        <div dir="rtl" className={`${modalBackdrop} z-[70]`}>
          <div className={`${modalCard} text-center`}>
            <div className="mb-4 flex justify-center">
              <Avatar name={profile.name} src={profile.avatar} size={72} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-[var(--gold)]">أهلاً بيك في المافيا</h2>
            <p className="mb-3 text-sm leading-relaxed text-[var(--text-1)]">
              اتعمللك يوزر نيم تلقائي، ده اللي أصحابك هيضيفوك بيه:
            </p>
            <p
              dir="ltr"
              className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-bold text-[var(--text-0)]"
            >
              @{profile.name}
            </p>
            <p className="mb-5 text-sm text-[var(--text-1)]">
              تحب تغيره دلوقتي؟ وتقدر تغيره في أي وقت من الملف الشخصي.
            </p>

            <button
              onClick={changeFromWelcome}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-3.5 text-base font-bold shadow-lg shadow-red-900/30"
            >
              تغيير اليوزر نيم
            </button>
            <button
              onClick={closeWelcome}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition-colors hover:bg-white/10"
            >
              سيبه كده
            </button>
          </div>
        </div>
      )}
    </>
  );
}