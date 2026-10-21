"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Check,
  CircleHelp,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import { fileToAvatar, loadProfile, saveProfile, type Profile } from "@/lib/client/profile";
import { isMuted, setMuted } from "@/lib/client/sound";

export default function Navbar({
  onOpenHowTo,
  onProfileChange,
}: {
  onOpenHowTo: () => void;
  onProfileChange?: (p: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile>({ name: "", avatar: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [muted, setMutedState] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setMutedState(isMuted());
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

  function openProfile() {
    setDraftName(profile.name);
    setDraftAvatar(profile.avatar);
    setError("");
    setMenuOpen(false);
    setProfileOpen(true);
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

  function saveDraft() {
    const name = draftName.trim();
    if (!name) {
      setError("اكتب اسمك أولًا من فضلك.");
      return;
    }
    const next: Profile = { name, avatar: draftAvatar };
    saveProfile(next);
    setProfile(next);
    onProfileChange?.(next);
    setProfileOpen(false);
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  const menuItem =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm text-[var(--text-0)] hover:bg-white/5";

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-md"
      >
        <div className="mx-auto grid h-24 max-w-md grid-cols-[1fr_auto_1fr] items-center px-5 pt-5">
                   {/* في RTL أول عنصر بيطلع على اليمين: زرار القايمة */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            className="group flex h-11 w-11 flex-col justify-center justify-self-start gap-[6px] text-[var(--text-0)] transition-opacity duration-200 active:opacity-60"
          >
            <span className="ml-auto block h-[2px] w-6 rounded-full bg-current transition-all duration-300" />
            <span className="ml-auto block h-[2px] w-4 rounded-full bg-current transition-all duration-300 group-hover:w-6" />
            <span className="ml-auto block h-[2px] w-5 rounded-full bg-current transition-all duration-300 group-hover:w-6" />
          </button>

          <div className="flex justify-center">
            <Image
              src="/logo-nav.png"
              alt="المافيا"
              width={480}
              height={120}
              priority
              className="logo-for-dark h-14 w-auto"
            />
            <Image
              src="/logo-nav-dark.png"
              alt="المافيا"
              width={480}
              height={120}
              priority
              className="logo-for-light h-14 w-auto"
            />
          </div>

          {/* آخر عنصر بيطلع على الشمال: صورة اللاعب */}
          <button
            onClick={openProfile}
            aria-label="الملف الشخصي"
            className="h-11 w-11 justify-self-end overflow-hidden rounded-full ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Avatar name={profile.name} src={profile.avatar} size={44} />
          </button>
        </div>

      </header>

      {/* القايمة الجانبية */}
      <div
        dir="rtl"
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <aside
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-white/10 bg-[var(--bg-1)] p-5 shadow-2xl transition-transform duration-300 ease-out ${
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
            className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-right hover:bg-white/5"
          >
            <Avatar name={profile.name} src={profile.avatar} size={52} />
            <span className="min-w-0">
              <span className="block truncate font-bold">{profile.name || "لاعب جديد"}</span>
              <span className="text-xs text-[var(--text-1)]">تعديل الملف الشخصي</span>
            </span>
          </button>

          <nav className="flex flex-col gap-1">
            <button onClick={openProfile} className={menuItem}>
              <UserRound className="h-5 w-5 text-[var(--gold)]" />
              الملف الشخصي
            </button>
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
          </nav>

          <p className="mt-auto text-center text-xs text-[var(--text-1)]/60">لعبة المافيا</p>
        </aside>
      </div>

      {/* نافذة الملف الشخصي */}
      {profileOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setProfileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in-up w-full max-w-sm rounded-3xl border border-white/10 bg-[var(--bg-1)] p-6 shadow-2xl"
          >
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

            <label className="mb-1.5 block text-xs text-[var(--text-1)]">اسمك</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={20}
              placeholder="اكتب اسمك هنا..."
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-[var(--gold)]/60 focus:ring-2 focus:ring-[var(--gold)]/30"
            />

            {error && (
              <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">{error}</p>
            )}

            <button
              onClick={saveDraft}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-3.5 text-base font-bold shadow-lg shadow-red-900/30 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              {busy ? "جارِ تجهيز الصورة..." : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}