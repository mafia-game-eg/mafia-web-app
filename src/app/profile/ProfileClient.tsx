"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Copy,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
  User,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";

/* =====================================================================
   ProfileClient — صفحة البروفايل (ثيم فاتح + ريسبونسيف على كل الأجهزة)
   بتجيب حسابك من /api/profile وتعدّل اليوزر نيم والصورة،
   وفيها قسم أصدقاء كامل (طلبات واردة / صادرة) بنفس فكرة ألعاب الشطرنج،
   بيتكلم مع /api/friends.
   لو مسار الـ API عندك مختلف، عدّل السطرين دول وبس.
===================================================================== */

const PROFILE_API = "/api/profile";
const FRIENDS_API = "/api/friends";

const NETWORK_ERROR_MSG = "حصلت مشكلة في الاتصال. اتأكد من النت وجرّب تاني.";

type FriendEntry = {
  friendshipId: string;
  id: string;
  username: string;
  avatar: string | null;
  since: string;
};

type RequestEntry = {
  id: string;
  user: { id: string; username: string; avatar: string | null };
  createdAt: string;
};

type FriendsData = {
  friends: FriendEntry[];
  incoming: RequestEntry[];
  outgoing: RequestEntry[];
};

type TabKey = "friends" | "incoming" | "outgoing";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "friends", label: "الأصدقاء" },
  { key: "incoming", label: "طلبات وصلت" },
  { key: "outgoing", label: "طلبات بعتّها" },
];

/* ----------------------------- أدوات صغيرة ----------------------------- */

function haptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

function stagger(i: number) {
  return { animationDelay: `${i * 70}ms` };
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "دلوقتي";
    if (mins < 60) return `من ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `من ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `من ${days} يوم`;
    return fmtDate(iso);
  } catch {
    return "";
  }
}

// بياخد الصورة، يقطعها مربع من النص، ويصغّرها تدريجيًا لحد ما تبقى
// أقل من الحد المسموح به في الـ API (120 ألف حرف كـ data URL)
async function shrinkImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read"));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("decode"));
    im.src = dataUrl;
  });

  const attempts: Array<[number, number]> = [
    [256, 0.85],
    [192, 0.8],
    [128, 0.72],
  ];

  for (const [size, quality] of attempts) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    const out = canvas.toDataURL("image/jpeg", quality);
    if (out.length <= 100_000) return out;
  }

  throw new Error("big");
}

/* ----------------------------- ستايلات محلية ----------------------------- */

const PF_CSS = `
@keyframes pf-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pf-pop {
  from { opacity: 0; transform: scale(.94) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes pf-toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pf-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.pf-card {
  border-radius: 28px;
  border: 1px solid #e9eaf1;
  background: #ffffff;
  box-shadow: 0 18px 50px -24px rgba(23, 23, 43, 0.18);
}
.pf-fade-up { animation: pf-fade-up .5s cubic-bezier(.22,.8,.32,1) both; }
.pf-pop { animation: pf-pop .28s cubic-bezier(.22,.8,.32,1) both; }
.pf-toast { animation: pf-toast-in .25s ease-out both; }
.pf-shake { animation: pf-shake .4s ease both; }
.pf-tabs { scrollbar-width: none; }
.pf-tabs::-webkit-scrollbar { display: none; }
.pf-scroll { scrollbar-width: thin; scrollbar-color: #d8dae5 transparent; }
.pf-scroll::-webkit-scrollbar { width: 6px; }
.pf-scroll::-webkit-scrollbar-thumb { background: #d8dae5; border-radius: 999px; }
@media (prefers-reduced-motion: reduce) {
  .pf-root *, .pf-root *::before, .pf-root *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;

/* ----------------------------- عناصر مشتركة ----------------------------- */

function PfAvatar({
  avatar,
  username,
  box,
  txt,
}: {
  avatar: string | null;
  username: string;
  box: string;
  txt: string;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        draggable={false}
        className={`${box} shrink-0 rounded-full object-cover shadow-md ring-2 ring-white`}
      />
    );
  }
  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 font-extrabold text-white shadow-md ring-2 ring-white`}
    >
      <span className={txt}>{(username || "؟").trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}

function PfEmpty({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f2f3f8]">{icon}</div>
      <p className="text-sm font-extrabold text-slate-600">{title}</p>
      <p className="max-w-[260px] text-xs leading-relaxed text-slate-400">{sub}</p>
    </div>
  );
}

/* ================================ الصفحة ================================ */

export default function ProfileClient() {
  const router = useRouter();

  // البروفايل
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [initial, setInitial] = useState<{ username: string; avatar: string | null }>({
    username: "",
    avatar: null,
  });
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [picking, setPicking] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // الأصدقاء
  const [friendsData, setFriendsData] = useState<FriendsData | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");
  const [tab, setTab] = useState<TabKey>("friends");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // حوار إضافة صديق
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addDone, setAddDone] = useState<{ kind: "sent" | "accepted"; username: string } | null>(null);
  const [addError, setAddError] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // عام
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "error" | "info" } | null>(null);
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = username.trim() !== initial.username || avatar !== initial.avatar;

  function toastMsg(msg: string, kind: "ok" | "error" | "info" = "info") {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  /* --------------------------- تحميل البروفايل --------------------------- */

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(PROFILE_API, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (res.status === 401) {
          setAuthRequired(true);
          return;
        }
        if (!res.ok) {
          toastMsg(typeof data?.error === "string" ? data.error : "مش قادر أجيب بياناتك.", "error");
          return;
        }
        const uname = typeof data?.username === "string" ? data.username : "";
        const av = typeof data?.avatar === "string" && data.avatar ? data.avatar : null;
        setInitial({ username: uname, avatar: av });
        setUsername(uname);
        setAvatar(av);
        setEmail(typeof data?.email === "string" && data.email ? data.email : null);
        setMemberSince(typeof data?.createdAt === "string" ? data.createdAt : null);
      } catch {
        if (alive) toastMsg(NETWORK_ERROR_MSG, "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ----------------------------- الأصدقاء ----------------------------- */

  const loadFriends = useCallback(async (silent = false) => {
    if (!silent) setFriendsLoading(true);
    setFriendsError("");
    try {
      const res = await fetch(FRIENDS_API, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (!silent) {
          setFriendsError(
            typeof data?.error === "string" ? data.error : "مش قادر أجيب الأصدقاء دلوقتي."
          );
        }
        return;
      }
      setFriendsData({
        friends: Array.isArray(data?.friends) ? data.friends : [],
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data?.outgoing) ? data.outgoing : [],
      });
    } catch {
      if (!silent) setFriendsError(NETWORK_ERROR_MSG);
    } finally {
      if (!silent) setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  /* --------------------------- الصورة الشخصية --------------------------- */

  async function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toastMsg("الصيغ المسموحة: PNG أو JPEG أو WebP.", "error");
      haptic([16, 60, 16]);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toastMsg("الصورة كبيرة أوي. اختار صورة أصغر من 8 ميجا.", "error");
      haptic([16, 60, 16]);
      return;
    }
    setPicking(true);
    try {
      const small = await shrinkImage(file);
      setAvatar(small);
      setFieldError("");
      haptic(10);
    } catch (err) {
      toastMsg(
        (err as Error)?.message === "big"
          ? "الصورة مضغوطتش قد الحجم المطلوب. جرّب صورة تاني."
          : "مش قادر أقرا الصورة دي.",
        "error"
      );
      haptic([16, 60, 16]);
    } finally {
      setPicking(false);
    }
  }

  /* ------------------------------- الحفظ ------------------------------- */

  async function handleSave() {
    if (saving) return;
    const uname = username.trim();
    if (!uname) {
      setFieldError("لازم تكتب يوزر نيم.");
      setShaking(true);
      haptic([16, 60, 16]);
      return;
    }
    const patch: { username?: string; avatar?: string | null } = {};
    if (uname !== initial.username) patch.username = uname;
    if (avatar !== initial.avatar) patch.avatar = avatar;
    if (Object.keys(patch).length === 0) {
      toastMsg("مفيش حاجة اتغيرت.", "info");
      return;
    }
    setSaving(true);
    setFieldError("");
    try {
      const res = await fetch(PROFILE_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : NETWORK_ERROR_MSG;
        if (res.status === 409 || msg.includes("اليوزر نيم")) {
          setFieldError(msg);
          setShaking(true);
        } else {
          toastMsg(msg, "error");
        }
        haptic([16, 60, 16]);
        return;
      }
      const finalName = typeof data?.username === "string" && data.username ? data.username : uname;
      setInitial({ username: finalName, avatar });
      setUsername(finalName);
      setSavedFlash(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedFlash(false), 2200);
      toastMsg("اتحفظ على حسابك.", "ok");
      haptic([10, 40, 10]);
    } catch {
      toastMsg(NETWORK_ERROR_MSG, "error");
      haptic([16, 60, 16]);
    } finally {
      setSaving(false);
    }
  }

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toastMsg("الإيميل اتنسخ.", "ok");
      haptic(8);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toastMsg("مش قادر أنسخ من المتصفح. انسخه بإيدك.", "error");
    }
  }

  /* --------------------------- أكشنات الأصدقاء --------------------------- */

  async function acceptRequest(entry: RequestEntry) {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      const res = await fetch(FRIENDS_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toastMsg(typeof data?.error === "string" ? data.error : NETWORK_ERROR_MSG, "error");
        haptic([16, 60, 16]);
        return;
      }
      setFriendsData((d) =>
        d
          ? {
              friends: [
                {
                  friendshipId: entry.id,
                  id: entry.user.id,
                  username: entry.user.username,
                  avatar: entry.user.avatar,
                  since: new Date().toISOString(),
                },
                ...d.friends,
              ],
              incoming: d.incoming.filter((x) => x.id !== entry.id),
              outgoing: d.outgoing,
            }
          : d
      );
      toastMsg(`بقيتو أصحاب. أهلاً بـ ${entry.user.username}.`, "ok");
      haptic([10, 40, 10]);
    } catch {
      toastMsg(NETWORK_ERROR_MSG, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function dropEntry(id: string, listKind: "friends" | "incoming" | "outgoing") {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`${FRIENDS_API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toastMsg(typeof data?.error === "string" ? data.error : NETWORK_ERROR_MSG, "error");
        haptic([16, 60, 16]);
        return;
      }
      setFriendsData((d) =>
        d
          ? {
              friends: d.friends.filter((x) => x.friendshipId !== id),
              incoming: d.incoming.filter((x) => x.id !== id),
              outgoing: d.outgoing.filter((x) => x.id !== id),
            }
          : d
      );
      setConfirmId(null);
      toastMsg(
        listKind === "friends"
          ? "اتشال من الأصدقاء."
          : listKind === "incoming"
            ? "الطلب اترفض."
            : "الطلب اتلغى.",
        "info"
      );
      haptic(8);
    } catch {
      toastMsg(NETWORK_ERROR_MSG, "error");
    } finally {
      setBusyId(null);
    }
  }

  function handleRemoveClick(id: string) {
    if (confirmId === id) {
      dropEntry(id, "friends");
      return;
    }
    setConfirmId(id);
    haptic(8);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 2600);
  }

  /* ------------------------- حوار إضافة صديق ------------------------- */

  function openDialog() {
    setAddName("");
    setAddError("");
    setAddDone(null);
    setDialogOpen(true);
    haptic(8);
    setTimeout(() => addInputRef.current?.focus(), 80);
  }

  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (addLoading) return;
    const name = addName.trim();
    if (!name) {
      setAddError("اكتب اسم صاحبك الأول.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(FRIENDS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAddError(typeof data?.error === "string" ? data.error : NETWORK_ERROR_MSG);
        haptic([16, 60, 16]);
        return;
      }
      const uname = typeof data?.username === "string" && data.username ? data.username : name;
      setAddDone({ kind: data?.accepted ? "accepted" : "sent", username: uname });
      setAddName("");
      loadFriends(true);
      haptic([10, 40, 10]);
    } catch {
      setAddError(NETWORK_ERROR_MSG);
      haptic([16, 60, 16]);
    } finally {
      setAddLoading(false);
    }
  }

  /* ------------------------------ إفكتات ------------------------------ */

  // قفل سكرول الصفحة والحوار مفتوح
  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  // زرار Esc يقفل الحوار
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

  // تنظيف التايمرات عند الخروج من الصفحة
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  /* ------------------------------ العرض ------------------------------ */

  if (loading) {
    return (
      <div dir="rtl" className="pf-root min-h-[100dvh] w-full bg-[#f5f6fa] text-[#171923]">
        <style>{PF_CSS}</style>
        <main className="mx-auto w-full max-w-5xl px-3 pb-14 pt-5 sm:px-6 sm:pt-8">
          <div className="h-9 w-28 animate-pulse rounded-full bg-white shadow-sm" />
          <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
            <div className="pf-card h-[420px] animate-pulse" />
            <div className="pf-card h-[420px] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div
        dir="rtl"
        className="pf-root flex min-h-[100dvh] w-full items-center justify-center bg-[#f5f6fa] px-4 text-[#171923]"
      >
        <style>{PF_CSS}</style>
        <div className="pf-card pf-pop w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f2f3f8]">
            <UserX className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-extrabold">الصفحة دي محتاجة تسجيل دخول</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            سجّل دخول الأول وبعدين ارجع هنا تظبط بروفايلك وضيف أصحابك.
          </p>
          <button
            type="button"
            onClick={() => {
              haptic(8);
              router.push("/");
            }}
            className="mt-5 w-full rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-[1.03] active:scale-[.99]"
          >
            الصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="pf-root min-h-[100dvh] w-full bg-[#f5f6fa] text-[#171923]">
      <style>{PF_CSS}</style>

      {/* توهجات خلفية ناعمة */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-72 overflow-hidden">
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -top-10 left-[6%] h-52 w-52 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-5xl px-3 pb-14 pt-5 sm:px-6 sm:pt-8">
        {/* رجوع */}
        <button
          type="button"
          onClick={() => {
            haptic(8);
            router.push("/");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[#e9eaf1] bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 active:scale-95"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>

        {/* العنوان */}
        <header className="pf-fade-up mb-5 mt-4 sm:mb-7">
          <h1 className="text-2xl font-extrabold sm:text-3xl">الملف الشخصي</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            صورتك واسمك وأصحابك — كله في مكان واحد.
          </p>
          <div className="mt-2.5 h-1.5 w-16 rounded-full bg-gradient-to-l from-amber-400 to-orange-500" />
        </header>

        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {/* ==================== كارت البروفايل ==================== */}
          <section className="pf-card pf-fade-up overflow-hidden" style={stagger(1)}>
            <div className="relative h-24 bg-gradient-to-l from-amber-100 via-orange-50 to-white sm:h-28">
              <div
                aria-hidden
                className="absolute -bottom-6 right-5 h-20 w-20 rounded-full bg-amber-300/30 blur-2xl sm:h-24 sm:w-24"
              />
            </div>

            <div className="-mt-12 px-5 pb-6 sm:-mt-14 sm:px-7 sm:pb-7">
              {/* الصورة */}
              <div className="mb-4 flex items-end justify-between">
                <div className="relative">
                  {picking ? (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white sm:h-28 sm:w-28">
                      <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                    </div>
                  ) : (
                    <PfAvatar
                      avatar={avatar}
                      username={username || initial.username}
                      box="h-24 w-24 sm:h-28 sm:w-28"
                      txt="text-4xl"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      haptic(8);
                      fileRef.current?.click();
                    }}
                    aria-label="غير صورتك"
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#e9eaf1] bg-white text-slate-600 shadow-md transition hover:text-amber-600 active:scale-95"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  {avatar && !picking && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic(8);
                        setAvatar(null);
                      }}
                      aria-label="شيل الصورة"
                      className="absolute -left-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#e9eaf1] bg-white text-slate-400 shadow-md transition hover:text-red-500 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="pb-1 text-xs text-slate-400">PNG أو JPEG أو WebP</p>
              </div>

              {/* اليوزر نيم */}
              <label className="mb-1.5 block text-xs font-bold text-slate-500" htmlFor="pf-username">
                اليوزر نيم
              </label>
              <div
                className={shaking ? "pf-shake" : ""}
                onAnimationEnd={() => setShaking(false)}
              >
                <div
                  className={`flex items-center overflow-hidden rounded-2xl border bg-[#f7f7fa] transition ${
                    fieldError
                      ? "border-red-300"
                      : "border-[#e5e6ee] focus-within:border-amber-400 focus-within:bg-white"
                  }`}
                >
                  <span className="pl-3 pr-4 text-sm font-bold text-slate-400">@</span>
                  <input
                    id="pf-username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldError("");
                    }}
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="اسمك في اللعبة"
                    className="w-full bg-transparent py-3 pl-4 text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
              {fieldError && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">{fieldError}</p>
              )}

              {/* الإيميل + تاريخ الانضمام */}
              <div className="mt-4 space-y-2 rounded-2xl border border-[#eeeff4] bg-[#fafbfd] p-3.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-600" dir="ltr">
                    {email ?? "—"}
                  </span>
                  {email && (
                    <button
                      type="button"
                      onClick={copyEmail}
                      aria-label="انسخ الإيميل"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-amber-600 active:scale-95"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {memberSince && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-slate-600">معانا من {fmtDate(memberSince)}</span>
                  </div>
                )}
              </div>

              {/* حفظ */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-[1.03] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto sm:px-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    بيتحدّث…
                  </>
                ) : savedFlash ? (
                  <>
                    <Check className="h-5 w-5" />
                    اتحفظ
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </button>
              <p className="mt-2.5 text-xs text-slate-400">
                التغييرات بتتخزن على حسابك وتظهر في كل الأجهزة.
              </p>
            </div>
          </section>

          {/* ==================== كارت الأصدقاء ==================== */}
          <section className="pf-card pf-fade-up p-5 sm:p-7" style={stagger(2)}>
            {/* رأس القسم */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold sm:text-xl">الأصدقاء</h2>
                <p className="text-xs text-slate-500 sm:text-sm">ضيف أصحابك والعبوا مع بعض</p>
              </div>
              <button
                type="button"
                onClick={() => loadFriends()}
                aria-label="حدّث القايمة"
                disabled={friendsLoading}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e9eaf1] bg-white text-slate-500 shadow-sm transition hover:text-amber-600 active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${friendsLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={openDialog}
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-[1.03] active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                إضافة صديق
              </button>
            </div>

            {friendsLoading && !friendsData ? (
              /* سكيليتون التحميل */
              <div className="space-y-3 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-[#eef0f5]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 animate-pulse rounded-full bg-[#eef0f5]" />
                      <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#f2f3f8]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friendsError ? (
              /* حالة الخطأ */
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-center">
                <UserX className="mx-auto mb-2 h-6 w-6 text-red-400" />
                <p className="text-sm font-semibold text-red-600">{friendsError}</p>
                <button
                  type="button"
                  onClick={() => loadFriends()}
                  className="mt-3 rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95"
                >
                  جرّب تاني
                </button>
              </div>
            ) : !friendsData ? null : (
              <>
                {/* تابات */}
                <div className="pf-tabs flex gap-2 overflow-x-auto pb-1">
                  {TABS.map((t) => {
                    const count =
                      t.key === "friends"
                        ? friendsData.friends.length
                        : t.key === "incoming"
                          ? friendsData.incoming.length
                          : friendsData.outgoing.length;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setTab(t.key);
                          haptic(6);
                        }}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                          active
                            ? "bg-[#171923] text-white shadow-md"
                            : "bg-[#f2f3f8] text-slate-500 hover:bg-[#e9eaf3]"
                        }`}
                      >
                        {t.label}
                        {count > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                              active ? "bg-white/20 text-white" : "bg-white text-amber-600 shadow-sm"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* القايمة */}
                <div className="pf-scroll mt-3 max-h-[430px] overflow-y-auto pl-1 sm:max-h-[540px]">
                  {tab === "friends" &&
                    (friendsData.friends.length === 0 ? (
                      <PfEmpty
                        icon={<User className="h-6 w-6 text-slate-300" />}
                        title="لسه مفيش أصدقاء"
                        sub="دوس «إضافة صديق» وابعت أول طلب لصاحبك."
                      />
                    ) : (
                      <ul className="divide-y divide-[#f0f1f6]">
                        {friendsData.friends.map((f, i) => (
                          <li
                            key={f.friendshipId}
                            className="pf-fade-up flex items-center gap-3 py-3"
                            style={stagger(Math.min(i, 8))}
                          >
                            <PfAvatar
                              avatar={f.avatar}
                              username={f.username}
                              box="h-11 w-11"
                              txt="text-lg"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-extrabold">{f.username}</p>
                              <p className="text-xs text-slate-400">أصحاب من {fmtDate(f.since)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveClick(f.friendshipId)}
                              disabled={busyId === f.friendshipId}
                              className={`flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-bold transition active:scale-95 disabled:opacity-60 ${
                                confirmId === f.friendshipId
                                  ? "border-red-200 bg-red-50 text-red-500"
                                  : "border-[#e9eaf1] bg-white text-slate-400 hover:text-red-500"
                              }`}
                            >
                              {confirmId === f.friendshipId
                                ? "متأكد؟"
                                : busyId === f.friendshipId
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {tab === "incoming" &&
                    (friendsData.incoming.length === 0 ? (
                      <PfEmpty
                        icon={<Inbox className="h-6 w-6 text-slate-300" />}
                        title="مفيش طلبات جديدة"
                        sub="أول ما حد يبعتلك طلب صداقة هيظهر هنا."
                      />
                    ) : (
                      <ul className="divide-y divide-[#f0f1f6]">
                        {friendsData.incoming.map((r, i) => (
                          <li
                            key={r.id}
                            className="pf-fade-up flex items-center gap-3 py-3"
                            style={stagger(Math.min(i, 8))}
                          >
                            <PfAvatar
                              avatar={r.user.avatar}
                              username={r.user.username}
                              box="h-11 w-11"
                              txt="text-lg"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-extrabold">
                                {r.user.username}
                              </p>
                              <p className="text-xs text-slate-400">
                                عايز يضيفك · {timeAgo(r.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => acceptRequest(r)}
                                disabled={busyId === r.id}
                                className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 text-xs font-extrabold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-95 disabled:opacity-60"
                              >
                                {busyId === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4" />
                                    قبول
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => dropEntry(r.id, "incoming")}
                                disabled={busyId === r.id}
                                aria-label="ارفض الطلب"
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e9eaf1] bg-white text-slate-400 transition hover:text-red-500 active:scale-95 disabled:opacity-60"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {tab === "outgoing" &&
                    (friendsData.outgoing.length === 0 ? (
                      <PfEmpty
                        icon={<Send className="h-6 w-6 text-slate-300" />}
                        title="معمشت أي طلبات"
                        sub="من زرار «إضافة صديق» فوق، اكتب اسم صاحبك وابعت الطلب."
                      />
                    ) : (
                      <ul className="divide-y divide-[#f0f1f6]">
                        {friendsData.outgoing.map((r, i) => (
                          <li
                            key={r.id}
                            className="pf-fade-up flex items-center gap-3 py-3"
                            style={stagger(Math.min(i, 8))}
                          >
                            <PfAvatar
                              avatar={r.user.avatar}
                              username={r.user.username}
                              box="h-11 w-11"
                              txt="text-lg"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-extrabold">
                                {r.user.username}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-amber-600/90">
                                <Clock className="h-3 w-3" />
                                مستني موافقته · {timeAgo(r.createdAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dropEntry(r.id, "outgoing")}
                              disabled={busyId === r.id}
                              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#e9eaf1] bg-white px-3.5 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:text-red-500 active:scale-95 disabled:opacity-60"
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              إلغاء
                            </button>
                          </li>
                        ))}
                      </ul>
                    ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* ==================== حوار إضافة صديق ==================== */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="إضافة صديق"
            className="pf-pop w-full max-w-md rounded-t-3xl border border-[#e9eaf1] bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            {/* رأس الحوار */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-extrabold">إضافة صديق</h3>
                <p className="text-xs text-slate-400">
                  اكتب اسم صاحبك بالظبط زي ما هو مكتوب في اللعبة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic(6);
                  setDialogOpen(false);
                }}
                aria-label="اقفل"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#f2f3f8] hover:text-slate-700 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addDone ? (
              /* حالة النجاح */
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-[15px] font-extrabold text-emerald-700">
                  {addDone.kind === "accepted"
                    ? `بقيتو أصحاب! ${addDone.username} كان بعتلك طلب — اتوافقناه.`
                    : `اتبعت الطلب لـ ${addDone.username}.`}
                </p>
                <p className="mt-1 text-xs text-emerald-600/80">
                  {addDone.kind === "accepted"
                    ? "هتلاقيه في قايمة الأصدقاء دلوقتي."
                    : "أول ما يوافق هيظهر عندك في قايمة الأصدقاء."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAddDone(null);
                    addInputRef.current?.focus();
                  }}
                  className="mt-4 rounded-xl border border-emerald-100 bg-white px-5 py-2.5 text-sm font-extrabold text-emerald-600 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                >
                  ضيف واحد تاني
                </button>
              </div>
            ) : (
              /* فورم الإرسال */
              <form onSubmit={submitAdd}>
                <div
                  className={`flex items-center overflow-hidden rounded-2xl border bg-[#f7f7fa] transition ${
                    addError
                      ? "border-red-300"
                      : "border-[#e5e6ee] focus-within:border-amber-400 focus-within:bg-white"
                  }`}
                >
                  <span className="pl-3 pr-4 text-sm font-bold text-slate-400">@</span>
                  <input
                    ref={addInputRef}
                    value={addName}
                    onChange={(e) => {
                      setAddName(e.target.value);
                      setAddError("");
                    }}
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="اسم الصديق"
                    className="w-full bg-transparent py-3.5 pl-4 text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                {addError && <p className="mt-2 text-xs font-semibold text-red-500">{addError}</p>}
                <button
                  type="submit"
                  disabled={addLoading || !addName.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-[1.03] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {addLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      بندوّر على الاسم ده…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال الطلب
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* توست */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
          <div
            className={`pf-toast pointer-events-auto flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-lg ${
              toast.kind === "ok"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : toast.kind === "error"
                  ? "border-red-100 bg-red-50 text-red-600"
                  : "border-[#e9eaf1] bg-white text-slate-600"
            }`}
          >
            {toast.kind === "ok" && <Check className="h-4 w-4 shrink-0" />}
            {toast.kind === "error" && <X className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* إنبوت الصورة المخفي */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handlePickFile}
      />
    </div>
  );
}


