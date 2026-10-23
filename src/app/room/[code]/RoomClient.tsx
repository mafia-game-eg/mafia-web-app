"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Copy,
  CircleHelp,
  Crown,
  Eye,
  Ghost,
  LogOut,
  Moon,
  Share2,
  Skull,
  Sun,
  Trophy,
  TriangleAlert,
  Volume2,
  VolumeX,
  VenetianMask,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { clearSession, loadSession, saveSession, type SessionInfo } from "@/lib/client/storage";
import { isMuted, setMuted, soundError, soundPhaseChange, soundSuccess, vibrate } from "@/lib/client/sound";
import type { PlayerView } from "@/lib/mafia/view";
import RoleCard from "@/components/mafia/RoleCard";
import Timer from "@/components/mafia/Timer";
import PlayerPickList from "@/components/mafia/PlayerPickList";
import HowToPlayModal from "@/components/mafia/HowToPlayModal";
import Avatar from "@/components/mafia/Avatar";
import { loadProfile, shrinkAvatar } from "@/lib/client/profile";

const POLL_MS = 1400;
const MIN_TO_START = 4; // ✏️ جديد: الحد الأدنى لبدء اللعبة (كان 5 مكتوبة في أكتر من مكان)
const MAX_POLL_FAILS = 4; // ✏️ جديد: عدد الفشلات المتتالية قبل ما نعرض شاشة الخطأ

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [view, setView] = useState<PlayerView | null>(null);
  const [fatalError, setFatalError] = useState("");
  const [actionError, setActionError] = useState("");
  const [muted, setMutedState] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [tick, setTick] = useState(0);
  const clockOffsetRef = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);
  const failRef = useRef(0); // ✏️ جديد: عدّاد فشل الـ polling المتتالي
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    setMutedState(isMuted());
    const s = loadSession(roomCode);
    if (s) setSession(s);
    else setJoinName(loadProfile().name);
  }, [roomCode]);

  // smooth timer re-render
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);

  // ✏️ اتعدلت: الخطأ المؤقت ما بيطردش اللاعب إلا بعد MAX_POLL_FAILS فشلات ورا بعض
  const poll = useCallback(async () => {
    if (!session) return;
    const res = await api.state(roomCode, session.playerId, session.token);
    if (!res.ok) {
      failRef.current += 1;
      if (failRef.current >= MAX_POLL_FAILS) setFatalError(res.error);
      return;
    }
    failRef.current = 0;
    if (res.view) {
      clockOffsetRef.current = res.view.serverNow - Date.now();
      setView(res.view);
      setFatalError("");
    }
  }, [roomCode, session]);

  useEffect(() => {
    if (!session) return;
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [session, poll]);

  // phase change feedback
  useEffect(() => {
    if (!view) return;
    const key = `${view.room.phase}:${view.room.nightSubPhase ?? ""}:${view.room.daySubPhase ?? ""}`;
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== key) {
      vibrate(80);
      soundPhaseChange();
    }
    prevPhaseRef.current = key;
    setTextInput("");
  }, [view?.room.phase, view?.room.nightSubPhase, view?.room.daySubPhase]);

  async function handleJoin() {
    setJoinError("");
    if (!joinName.trim()) {
      setJoinError("اكتب اسمك أولًا.");
      return;
    }
    setJoinLoading(true);
    const avatar = await shrinkAvatar(loadProfile().avatar);
    const res = await api.join({ roomCode, playerName: joinName.trim(), avatar });
    setJoinLoading(false);
    if (!res.ok) {
      setJoinError(res.error);
      return;
    }
    const s: SessionInfo = {
      roomCode,
      playerId: res.playerId,
      token: res.token,
      name: joinName.trim(),
    };
    saveSession(s);
    setSession(s);
  }

  function secondsLeft(): number {
    if (!view?.room.phaseEndsAt) return 0;
    void tick;
    const now = Date.now() + clockOffsetRef.current;
    return Math.max(0, (view.room.phaseEndsAt - now) / 1000);
  }

  function totalSecondsFor(): number {
    if (!view) return 1;
    switch (view.room.phase) {
      case "night":
        return 15;
      case "morning":
        return 8;
      case "day_questions":
        return view.room.daySubPhase === "question" ? 30 : 30;
      case "day_accusation":
        return 30;
      case "voting":
        return 30;
      case "vote_reveal":
        return 10;
      default:
        return 1;
    }
  }

  async function runAction<T>(fn: () => Promise<{ ok: boolean; error?: string; view?: PlayerView }>) {
    setActionError("");
    const res = await fn();
    if (!res.ok) {
      setActionError(res.error ?? "حدث خطأ.");
      soundError();
      vibrate([40, 40, 40]);
      return;
    }
    soundSuccess();
    if (res.view) setView(res.view);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // ignore
    }
  }

  async function shareCode() {
    const url = `${window.location.origin}/room/${roomCode}`;
    const shareData = {
      title: "انضم للعبة المافيا",
      text: `انضم إلى غرفة المافيا بالكود ${roomCode}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // ignore cancel
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
    }
  }

  async function leaveToHome() {
    if (session) {
      await api.leave(roomCode, session.playerId, session.token).catch(() => {});
    }
    clearSession(roomCode);
    router.push("/");
  }

  // ---------- render states ----------

  if (fatalError) {
    return (
      <Screen>
        <div className="text-center">
          <TriangleAlert className="mx-auto mb-3 h-14 w-14 text-red-400" strokeWidth={1.5} />
          <p className="mb-6 text-lg text-red-300">{fatalError}</p>
          <button
            onClick={() => {
              clearSession(roomCode);
              router.push("/");
            }}
            className="rounded-2xl bg-[var(--accent)] px-6 py-3 font-bold"
          >
            العودة للرئيسية
          </button>
        </div>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        {/* ✏️ اتشال "[]" الزايدة اللي كانت بتظهر كنص في أول الكارت */}
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl">
          <h1 className="mb-1 text-lg font-bold text-[var(--gold)]">الانضمام للغرفة</h1>
          <p className="mb-4 text-sm text-[var(--text-1)]">كود الغرفة: {roomCode}</p>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={20}
            placeholder="اكتب اسمك هنا..."
            className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
          <button
            disabled={joinLoading}
            onClick={handleJoin}
            className="w-full rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-3 font-bold disabled:opacity-50"
          >
            {joinLoading ? "جارِ الدخول..." : "انضمام"}
          </button>
          {joinError && <p className="mt-3 text-sm text-red-300">{joinError}</p>}
        </div>
      </Screen>
    );
  }

  if (!view) {
    return (
      <Screen>
        <p className="animate-pulse text-[var(--text-1)]">جارِ الاتصال بالغرفة...</p>
      </Screen>
    );
  }

  const { room, me } = view;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-4" dir="rtl">
      <Header
        roomCode={roomCode}
        muted={muted}
        onToggleMute={toggleMute}
        onHowTo={() => setShowHowTo(true)}
        onLeave={leaveToHome}
        isHost={me.isHost}
        // ✏️ زرار "دوري" متاح في الهيدر بعد بدء اللعبة (مش بس بالليل)
        onOpenRole={me.roleInfo && room.phase !== "lobby" ? () => setShowRoleModal(true) : undefined}
      />

      {!me.alive && room.phase !== "lobby" && room.phase !== "role_reveal" && room.phase !== "game_over" && (
        <div className="mb-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-center text-sm text-[var(--text-1)]">
          <Ghost className="ml-1.5 inline h-4 w-4 align-text-bottom" />
          لقد خرجت من اللعبة وأصبحت متفرجًا، يمكنك متابعة الأحداث فقط.
        </div>
      )}

      {actionError && (
        <div className="mb-3 rounded-2xl bg-red-500/15 px-4 py-2 text-center text-sm text-red-300">
          {actionError}
        </div>
      )}

      {room.phase === "lobby" && (
        <LobbyView view={view} session={session} onCopy={copyCode} onShare={shareCode} runAction={runAction} />
      )}

      {room.phase === "role_reveal" && (
        <RoleRevealView view={view} session={session} runAction={runAction} secondsLeft={secondsLeft()} />
      )}

      {room.phase === "night" && (
        <NightView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          onOpenRole={() => setShowRoleModal(true)}
        />
      )}

      {room.phase === "morning" && <MorningView view={view} secondsLeft={secondsLeft()} total={totalSecondsFor()} />}

      {room.phase === "day_questions" && (
        <DayQuestionsView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          textInput={textInput}
          setTextInput={setTextInput}
        />
      )}

      {room.phase === "day_accusation" && (
        <AccusationView
          view={view}
          session={session}
          runAction={runAction}
          secondsLeft={secondsLeft()}
          total={totalSecondsFor()}
          textInput={textInput}
          setTextInput={setTextInput}
        />
      )}

      {room.phase === "voting" && (
        <VotingView view={view} session={session} runAction={runAction} secondsLeft={secondsLeft()} total={totalSecondsFor()} />
      )}

      {room.phase === "vote_reveal" && (
        <VoteRevealView view={view} secondsLeft={secondsLeft()} total={totalSecondsFor()} />
      )}

      {room.phase === "game_over" && <GameOverView view={view} session={session} runAction={runAction} />}

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      {showRoleModal && me.roleInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowRoleModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <RoleCard
              icon={me.roleInfo.icon}
              title={me.roleInfo.title}
              description={me.roleInfo.description}
              team={me.roleInfo.team}
              mafiaTeammates={me.mafiaTeammates}
            />
            {/* ✏️ نتائج المحقق: كانت بتتبعت من السيرفر لكن مش بتتعرض في أي مكان */}
            {me.role === "detective" && (
              <div className="mx-auto mt-4 w-full max-w-xs rounded-2xl border border-white/10 bg-black/40 p-3 text-right text-sm">
                <p className="mb-2 font-bold text-[var(--gold)]">🕵️ نتائج تحقيقاتك</p>
                {me.investigations.length === 0 ? (
                  <p className="text-xs text-[var(--text-1)]">لم تحقق مع أحد بعد.</p>
                ) : (
                  <ul className="space-y-1">
                    {me.investigations.map((inv) => (
                      <li key={`${inv.night}-${inv.targetId}`} className="flex items-center justify-between gap-2">
                        <span>
                          الليلة {inv.night}: {inv.targetName}
                        </span>
                        <span className={inv.isMafia ? "text-red-300" : "text-teal-300"}>
                          {inv.isMafia ? "مافيا 🔪" : "ليس مافيا ✅"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="mt-4 text-center text-xs text-[var(--text-1)]">اضغط في أي مكان للإغلاق</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5" dir="rtl">
      {children}
    </main>
  );
}

function Header({
  roomCode,
  muted,
  onToggleMute,
  onHowTo,
  onLeave,
  isHost,
  onOpenRole,
}: {
  roomCode: string;
  muted: boolean;
  onToggleMute: () => void;
  onHowTo: () => void;
  onLeave: () => void;
  isHost: boolean;
  onOpenRole?: () => void;
}) {
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-1)] hover:bg-white/10 hover:text-white";
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <VenetianMask className="h-5 w-5 text-[var(--gold)]" />
        <span className="font-bold tracking-widest text-[var(--gold)]">{roomCode}</span>
        {isHost && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10px] text-[var(--gold)]">
            <Crown className="h-3 w-3" />
            مضيف
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onOpenRole && (
          <button onClick={onOpenRole} className={iconBtn} aria-label="دوري">
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button onClick={onToggleMute} className={iconBtn} aria-label="الصوت">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button onClick={onHowTo} className={iconBtn} aria-label="كيف تلعب">
          <CircleHelp className="h-4 w-4" />
        </button>
        <button onClick={onLeave} className={iconBtn} aria-label="خروج">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type RunAction = (fn: () => Promise<{ ok: boolean; error?: string; view?: PlayerView }>) => Promise<void>;

function LobbyView({
  view,
  session,
  onCopy,
  onShare,
  runAction,
}: {
  view: PlayerView;
  session: SessionInfo;
  onCopy: () => void;
  onShare: () => void;
  runAction: RunAction;
}) {
  const { room, players, me } = view;
  const activeCount = players.length;
  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="rounded-3xl border border-[var(--gold)]/30 bg-white/[0.03] p-6 text-center">
        <p className="mb-2 text-sm text-[var(--text-1)]">كود الغرفة</p>
        <p className="mb-4 text-5xl font-extrabold tracking-[0.3em] text-[var(--gold)]">{room.code}</p>
        <div className="flex justify-center gap-3">
          <button onClick={onCopy} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold">
            <Copy className="ml-1.5 inline h-4 w-4 align-text-bottom" /> نسخ
          </button>
          <button onClick={onShare} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold">
           <Share2 className="ml-1.5 inline h-4 w-4 align-text-bottom" /> مشاركة
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">اللاعبون</h3>
          <span className="text-sm text-[var(--text-1)]">
            دخل {activeCount} من {room.settings.maxPlayers}
          </span>
        </div>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Avatar name={p.name} src={p.avatar ?? null} size={32} />
                <span className={`h-2 w-2 rounded-full ${p.connected ? "bg-emerald-400" : "bg-white/20"}`} />
                {p.name} {p.isMe && <span className="text-[var(--text-1)]">(أنت)</span>}
                {p.isHost && <Crown className="h-4 w-4 text-[var(--gold)]" />}
              </span>
              {me.isHost && !p.isMe && (
                <button
                  onClick={() => runAction(() => api.kick(room.code, session.playerId, session.token, p.id))}
                  className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300"
                >
                  طرد
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {me.isHost && (
        <button
          disabled={activeCount < MIN_TO_START}
          onClick={() => runAction(() => api.start(room.code, session.playerId, session.token))}
          className="w-full rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-4 text-lg font-bold shadow-lg disabled:opacity-40"
        >
          {activeCount < MIN_TO_START ? `تحتاج ${MIN_TO_START} لاعبين على الأقل` : "ابدأ اللعبة الآن"}
        </button>
      )}
      {!me.isHost && (
        <p className="text-center text-sm text-[var(--text-1)]">
          بانتظار المضيف... ستبدأ اللعبة تلقائيًا عند اكتمال العدد.
        </p>
      )}
    </div>
  );
}

function RoleRevealView({
  view,
  session,
  runAction,
  secondsLeft,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
}) {
  const { me, players, room } = view;
  const readyCount = players.filter((p) => p.ready).length;
  if (!me.roleInfo) return null;
  return (
    <div className="animate-fade-in-up space-y-6 text-center">
      <h2 className="text-xl font-bold text-[var(--gold)]">هذا دورك في هذه الجولة</h2>
      <RoleCard
        icon={me.roleInfo.icon}
        title={me.roleInfo.title}
        description={me.roleInfo.description}
        team={me.roleInfo.team}
        mafiaTeammates={me.mafiaTeammates}
      />
      <p className="text-xs text-[var(--text-1)]">اضغط مطولًا على الكارت لرؤية دورك، وارفع إصبعك لإخفائه.</p>

      <button
        disabled={!!me.ready}
        onClick={() => runAction(() => api.ready(room.code, session.playerId, session.token))}
        className="w-full rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-4 text-lg font-bold disabled:opacity-50"
      >
        {me.ready ? "بانتظار الباقي..." : "أنا جاهز ✅"}
      </button>
      <p className="text-sm text-[var(--text-1)]">
        جاهز {readyCount} من {players.length}
      </p>
      <p className="text-xs text-[var(--text-1)]/60">{Math.ceil(secondsLeft)} ثانية متبقية كحد أقصى</p>
    </div>
  );
}

function NightView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  onOpenRole,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  onOpenRole: () => void;
}) {
  const { room, night, me } = view;
  if (!night) return null;
  const canAct = me.alive;
  // ✏️ زرار "تخطّي" بيظهر لكل اللاعبين في مرحلة القناص (مش للقناص بس)،
  // عشان وجوده على شاشة واحد بس ما يكشفش إنه القناص. السيرفر بيتجاهله لو مش قناص.
  const extraOption =
    room.nightSubPhase === "extra" && night.extraRoleType === "sniper"
      ? { id: "skip", label: "⏭️ تخطّي (لا تطلق)" }
      : undefined;
  return (
    <div className="animate-fade-in-up space-y-5">
      <div className=" keep-dark rounded-3xl border border-indigo-400/20 bg-gradient-to-b from-[#0d0a18] to-[#06050c] p-6 text-center">
        <Moon className="animate-moon mx-auto mb-2 h-12 w-12 text-indigo-200" strokeWidth={1.5} />
        <p className="text-[var(--text-1)]">الليل نزل رقم {room.nightNumber}... الكل نايم</p>
        <h2 className="mt-2 text-lg font-bold text-[var(--gold)]">{night.label}</h2>
        <p className="mt-1 text-sm text-[var(--text-1)]">{night.instruction}</p>
        <button onClick={onOpenRole} className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs">
          <Eye className="ml-1 inline h-3.5 w-3.5 align-text-bottom" /> دوري
        </button>
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={total} />

      {night.mafiaLivePicks && night.mafiaLivePicks.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm">
          <p className="mb-1 text-red-300">اختيارات زملائك الحالية:</p>
          <ul className="space-y-1 text-[var(--text-1)]">
            {night.mafiaLivePicks.map((p, i) => (
              <li key={i}>
                {p.mafiaName} ← اختار {p.targetName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlayerPickList
        choices={night.choices}
        avatars={Object.fromEntries(view.players.map((p) => [p.id, p.avatar]))}
        myChoice={night.myChoice}
        disabled={!canAct}
        forbiddenId={night.forbiddenTargetId}
        extraOption={extraOption}
        onPick={(id) => runAction(() => api.nightAction(room.code, session.playerId, session.token, id))}
      />
      {!canAct && <p className="text-center text-xs text-[var(--text-1)]">أنت متفرج، اختيارك هنا لا تأثير له.</p>}
    </div>
  );
}

function MorningView({ view, secondsLeft, total }: { view: PlayerView; secondsLeft: number; total: number }) {
  const { morning } = view;
  return (
    <div className="animate-fade-in-up space-y-6 text-center">
      <Sun className="mx-auto h-14 w-14 text-[var(--gold)]" strokeWidth={1.5} />
      <h2 className="text-xl font-bold text-[var(--gold)]">صباح الخير أيها الناجون</h2>
      {morning?.noneKilled ? (
        <p className="text-lg text-emerald-300">🕊️ لم يمت أحد الليلة الماضية!</p>
      ) : (
        <div className="space-y-1">
          {morning?.killedNames.map((n) => (
            <p key={n} className="text-lg text-red-300">
              💀 توفي الليلة الماضية: {n}
            </p>
          ))}
        </div>
      )}
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
    </div>
  );
}

function ChatLog({ view }: { view: PlayerView }) {
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin rounded-2xl border border-white/10 bg-black/20 p-3">
      {view.chat.length === 0 && <p className="text-center text-xs text-[var(--text-1)]">لا توجد رسائل بعد</p>}
      {view.chat.map((c) => (
        <div key={c.id} className="text-sm">
          {c.type === "system" ? (
            <p className="text-center text-xs text-[var(--text-1)]">{c.text}</p>
          ) : (
            <p>
              <span
                className={`font-bold ${c.type === "accusation" ? "text-red-300" : "text-[var(--gold)]"}`}
              >
                {c.fromName}:
              </span>{" "}
              <span className="text-[var(--text-0)]">{c.text}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DayQuestionsView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  textInput,
  setTextInput,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  textInput: string;
  setTextInput: (v: string) => void;
}) {
  const { day, room } = view;
  if (!day) return null;
  const isQuestionStep = day.subPhase === "question";
  const mustAct = (isQuestionStep && day.isAsker && !day.questionSubmitted) || (!isQuestionStep && day.isAnswerer && !day.answerSubmitted);

  async function submit() {
    if (!textInput.trim()) return;
    if (isQuestionStep) {
      await runAction(() => api.question(room.code, session.playerId, session.token, textInput.trim()));
    } else {
      await runAction(() => api.answer(room.code, session.playerId, session.token, textInput.trim()));
    }
    setTextInput("");
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <p className="text-xs text-[var(--text-1)]">
          جولة أسئلة {day.pairIndex + 1} من {day.totalPairs}
        </p>
        <h2 className="mt-1 text-lg font-bold text-[var(--gold)]">
          {day.askerName} يسأل {day.answererName}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-1)]">
          {isQuestionStep ? "بانتظار السؤال..." : "بانتظار الإجابة..."}
        </p>
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={total} />

      {mustAct ? (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, 140))}
            placeholder={isQuestionStep ? "اكتب سؤالك هنا (حتى 140 حرفًا)" : "اكتب إجابتك هنا (حتى 140 حرفًا)"}
            className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--gold)]"
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-[var(--text-1)]">
            <span>{textInput.length}/140</span>
            <button onClick={submit} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-bold text-white">
              إرسال
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-[var(--text-1)]">
          {day.isAsker || day.isAnswerer ? "بانتظار الطرف الآخر..." : "تابع المحادثة أدناه"}
        </p>
      )}

      <ChatLog view={view} />
    </div>
  );
}

function AccusationView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
  textInput,
  setTextInput,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
  textInput: string;
  setTextInput: (v: string) => void;
}) {
  const { accusation, room } = view;
  async function submit() {
    if (!textInput.trim()) return;
    await runAction(() => api.accuse(room.code, session.playerId, session.token, textInput.trim()));
    setTextInput("");
  }
  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <h2 className="text-lg font-bold text-[var(--gold)]">🗣️ وقت الاتهامات</h2>
        <p className="mt-1 text-sm text-[var(--text-1)]">رسالة واحدة قصيرة لكل لاعب</p>
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      {accusation?.canSubmit && !accusation.submitted ? (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, 100))}
            placeholder="اكتب اتهامك أو رأيك هنا (حتى 100 حرف)"
            className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--gold)]"
            rows={2}
          />
          <div className="flex items-center justify-between text-xs text-[var(--text-1)]">
            <span>{textInput.length}/100</span>
            <button onClick={submit} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-bold text-white">
              إرسال
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-[var(--text-1)]">
          {accusation?.submitted ? "تم إرسال رسالتك ✅" : "أنت متفرج الآن"}
        </p>
      )}
      <ChatLog view={view} />
    </div>
  );
}

function VotingView({
  view,
  session,
  runAction,
  secondsLeft,
  total,
}: {
  view: PlayerView;
  session: SessionInfo;
  runAction: RunAction;
  secondsLeft: number;
  total: number;
}) {
  const { voting, room, me } = view;
  if (!voting) return null;
  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <h2 className="text-lg font-bold text-[var(--gold)]">🗳️ {voting.isRevote ? "إعادة التصويت" : "وقت التصويت"}</h2>
        <p className="mt-1 text-sm text-[var(--text-1)]">صوّتك سري حتى تنتهي الجولة</p>
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      {me.alive ? (
        <PlayerPickList
          choices={voting.choices}
          avatars={Object.fromEntries(view.players.map((p) => [p.id, p.avatar]))}
          myChoice={voting.myVote}
          extraOption={{ id: "abstain", label: "🤷 امتناع" }}
          onPick={(id) => runAction(() => api.vote(room.code, session.playerId, session.token, id))}
        />
      ) : (
        <p className="text-center text-sm text-[var(--text-1)]">أنت متفرج، لا يمكنك التصويت.</p>
      )}
      {voting.hasVoted && me.alive && (
        <p className="text-center text-sm text-emerald-300">تم تسجيل صوتك ✅ بانتظار الباقي...</p>
      )}
    </div>
  );
}

function VoteRevealView({ view, secondsLeft, total }: { view: PlayerView; secondsLeft: number; total: number }) {
  const r = view.voteReveal;
  if (!r) return null;
  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <h2 className="text-lg font-bold text-[var(--gold)]">نتيجة التصويت</h2>
        {r.eliminatedName ? (
          <p className="mt-2 text-lg text-red-300">⚖️ تم إعدام {r.eliminatedName}</p>
        ) : r.revote ? (
          <p className="mt-2 text-lg text-amber-300">تعادل! ستتم إعادة التصويت بين المتعادلين</p>
        ) : (
          <p className="mt-2 text-lg text-amber-300">تعادل الأصوات، لم يتم إعدام أحد</p>
        )}
      </div>
      <Timer secondsLeft={secondsLeft} totalSeconds={total} />
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="mb-2 text-sm font-bold">تفاصيل الأصوات:</p>
        <ul className="space-y-1 text-sm text-[var(--text-1)]">
          {r.results.map((v, i) => (
            <li key={i}>
              {v.voterName} ← {v.targetName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GameOverView({ view, session, runAction }: { view: PlayerView; session: SessionInfo; runAction: RunAction }) {
  const g = view.gameOver;
  if (!g) return null;
  return (
    <div className="animate-fade-in-up space-y-5 text-center">
      {g.winner === "citizens" ? (
        <Trophy className="mx-auto h-16 w-16 text-[var(--gold)]" strokeWidth={1.5} />
      ) : (
        <Skull className="mx-auto h-16 w-16 text-[var(--accent)]" strokeWidth={1.5} />
      )}
      <h2 className="text-2xl font-extrabold text-[var(--gold)]">
        {g.winner === "citizens" ? "فاز المواطنون الصالحون!" : "فازت المافيا!"}
      </h2>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right">
        <p className="mb-2 font-bold">كشف الأدوار:</p>
        <ul className="space-y-1 text-sm">
          {g.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Avatar name={p.name} src={p.avatar} size={28} />
                {p.roleInfo?.icon} {p.name} {!p.alive && "💀"}
              </span>
              <span className={p.roleInfo?.team === "mafia" ? "text-red-300" : "text-teal-300"}>
                {p.roleInfo?.title}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {g.nightLogs.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right">
          <p className="mb-2 font-bold">ملخص الليالي:</p>
          <ul className="space-y-1 text-sm text-[var(--text-1)]">
            {g.nightLogs.map((n) => (
              <li key={n.night}>
                الليلة {n.night}: {n.killedNames.length ? `مات ${n.killedNames.join("، ")}` : "لم يمت أحد"}
                {n.savedName ? ` (تم إنقاذ ${n.savedName})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.me.isHost ? (
        <button
          onClick={() => runAction(() => api.playAgain(view.room.code, session.playerId, session.token))}
          className="w-full rounded-2xl bg-gradient-to-l from-[var(--accent)] to-[var(--accent-2)] px-4 py-4 text-lg font-bold"
        >
          العب تاني 🔁
        </button>
      ) : (
        <p className="text-sm text-[var(--text-1)]">بانتظار المضيف لبدء جولة جديدة...</p>
      )}
    </div>
  );
}