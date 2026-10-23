import type { NightLogEntry, Player, Role, Room, VoteRevealResult } from "./types";
import { ROLE_INFO } from "./roles";
import { alivePlayers } from "./engine";

// ✏️ النص ده بيظهر لكل اللاعبين بنفس الشكل (عن قصد)، عشان محدش يعرف دور غيره من شاشته.
// الجملة التانية بتشرح للي مش دوره إن اختياره تمويه ومش هيتحسب.
const DECOY_NOTE = " إن لم يكن دورك الآن فاختر أي لاعب للتمويه؛ اختيارك لن يُحتسب.";

const NIGHT_LABELS: Record<string, { label: string; instruction: string }> = {
  mafia: {
    label: "مرحلة المافيا",
    instruction: "المافيا تختار ضحية الليلة." + DECOY_NOTE,
  },
  doctor: {
    label: "مرحلة الطبيب",
    instruction: "الطبيب يختار من ينقذه الليلة." + DECOY_NOTE,
  },
  detective: {
    label: "مرحلة المحقق",
    instruction: "المحقق يختار من يتحقق منه الليلة." + DECOY_NOTE,
  },
  extra: {
    label: "مرحلة الدور الإضافي",
    instruction: "صاحب الدور الإضافي يتصرف الليلة." + DECOY_NOTE,
  },
};

function isMafiaTeam(player: Player | undefined): boolean {
  return !!player && player.role === "mafia";
}

export interface PlayerViewPlayer {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
  ready?: boolean;
  isMe: boolean;
  avatar?: string | null;
  role?: Role | null;
}

export interface PlayerViewChat {
  id: string;
  type: "qa_question" | "qa_answer" | "accusation" | "system";
  fromName: string | null;
  text: string;
  createdAt: number;
}

export interface PlayerViewRoleInfo {
  title: string;
  description: string;
  icon: string;
  team: "mafia" | "town";
}

export interface PlayerView {
  ok: true;
  serverNow: number;
  room: {
    code: string;
    phase: Room["phase"];
    nightSubPhase: Room["nightSubPhase"];
    nightNumber: number;
    daySubPhase: Room["daySubPhase"];
    phaseEndsAt: number | null;
    timeLeftMs: number | null;
    hostId: string;
    gameStarted: boolean;
    winner: Room["winner"];
    settings: Room["settings"];
  };
  me: {
    id: string;
    name: string;
    isHost: boolean;
    alive: boolean;
    ready: boolean;
    avatar: string | null;
    role: Role | null;
    roleInfo: PlayerViewRoleInfo | null;
    mafiaTeammates?: { id: string; name: string }[];
    investigations: Player["investigations"];
    sniperUsed: boolean;
  };
  players: PlayerViewPlayer[];
  chat: PlayerViewChat[];
  night?: {
    label: string;
    instruction: string;
    choices: { id: string; name: string }[];
    myChoice?: string;
    mafiaLivePicks?: { mafiaName: string; targetName: string }[];
    forbiddenTargetId: string | null;
    isSniperWithShotUsed: boolean;
    extraRoleType: Room["settings"]["extraRoleType"];
  };
  morning?: {
    killedNames: string[];
    noneKilled: boolean;
  };
  day?: {
    subPhase: "question" | "answer";
    pairIndex: number;
    totalPairs: number;
    askerId?: string;
    askerName?: string;
    answererId?: string;
    answererName?: string;
    isAsker: boolean;
    isAnswerer: boolean;
    questionSubmitted: boolean;
    answerSubmitted: boolean;
  };
  accusation?: {
    submitted: boolean;
    canSubmit: boolean;
  };
  voting?: {
    choices: { id: string; name: string }[];
    myVote?: string;
    hasVoted: boolean;
    isRevote: boolean;
  };
  voteReveal?: VoteRevealResult | null;
  gameOver?: {
    winner: Room["winner"];
    players: {
      id: string;
      name: string;
      avatar: string | null;
      role: Role | null;
      roleInfo: PlayerViewRoleInfo | null;
      alive: boolean;
    }[];
    nightLogs: NightLogEntry[];
  };
}

export function buildView(room: Room, me: Player): PlayerView {
  const now = Date.now();
  const timeLeftMs = room.phaseEndsAt ? Math.max(0, room.phaseEndsAt - now) : null;

  const players: PlayerViewPlayer[] = room.playerOrder
    .map((id) => room.players[id])
    .filter((p): p is Player => !!p && !p.kicked)
    .map((p) => {
      const revealRole =
        room.phase === "game_over" ||
        !!room.revealedRoles[p.id] ||
        p.id === me.id ||
        (isMafiaTeam(me) && isMafiaTeam(p));
      return {
        id: p.id,
        name: p.name,
        alive: p.alive,
        connected: p.connected,
        isHost: p.isHost,
        ready: room.phase === "role_reveal" ? p.ready : undefined,
        isMe: p.id === me.id,
        avatar: p.avatar ?? null,
        role: revealRole ? p.role : undefined,
      };
    });

  const roleInfo = me.role ? ROLE_INFO[me.role] : null;
  const mafiaTeammates = isMafiaTeam(me)
    ? players
        .filter((p) => p.role === "mafia" && p.id !== me.id)
        .map((p) => ({ id: p.id, name: p.name }))
    : undefined;

  const chat: PlayerViewChat[] = room.chatLog.slice(-200).map((c) => ({
    id: c.id,
    type: c.type,
    fromName: c.fromName,
    text: c.text,
    createdAt: c.createdAt,
  }));

  const view: PlayerView = {
    ok: true,
    serverNow: now,
    room: {
      code: room.code,
      phase: room.phase,
      nightSubPhase: room.nightSubPhase,
      nightNumber: room.nightNumber,
      daySubPhase: room.daySubPhase,
      phaseEndsAt: room.phaseEndsAt,
      timeLeftMs,
      hostId: room.hostId,
      gameStarted: room.gameStarted,
      winner: room.winner,
      settings: room.settings,
    },
    me: {
      id: me.id,
      name: me.name,
      isHost: me.isHost,
      alive: me.alive,
      ready: me.ready,
      avatar: me.avatar ?? null,
      role: me.role,
      roleInfo: roleInfo
        ? { title: roleInfo.title, description: roleInfo.description, icon: roleInfo.icon, team: roleInfo.team }
        : null,
      mafiaTeammates,
      investigations: me.investigations,
      sniperUsed: me.sniperUsed,
    },
    players,
    chat,
  };

  if (room.phase === "night" && room.nightSubPhase) {
    const alive = alivePlayers(room).map((p) => ({ id: p.id, name: p.name }));
    const labels = NIGHT_LABELS[room.nightSubPhase];
    let mafiaLivePicks: { mafiaName: string; targetName: string }[] | undefined;
    if (isMafiaTeam(me) && room.nightSubPhase === "mafia") {
      mafiaLivePicks = Object.entries(room.mafiaVotes).map(([voterId, targetId]) => ({
        mafiaName: room.players[voterId]?.name ?? "؟",
        targetName: room.players[targetId]?.name ?? "؟",
      }));
    }
    let myChoice: string | undefined;
    if (room.nightSubPhase === "mafia" && me.role === "mafia") myChoice = room.mafiaVotes[me.id];
    if (room.nightSubPhase === "doctor" && me.role === "doctor") myChoice = room.doctorSaveChoice ?? undefined;
    if (room.nightSubPhase === "detective" && me.role === "detective")
      myChoice = room.detectiveChoices[me.id];
    if (room.nightSubPhase === "extra" && (me.role === "bodyguard" || me.role === "sniper"))
      myChoice = room.extraSaveChoice ?? undefined;

    view.night = {
      label: labels?.label ?? "",
      instruction: labels?.instruction ?? "",
      choices: alive,
      myChoice,
      mafiaLivePicks,
      forbiddenTargetId:
        room.nightSubPhase === "doctor" && me.role === "doctor" ? room.previousDoctorSave : null,
      isSniperWithShotUsed: me.role === "sniper" && me.sniperUsed,
      extraRoleType: room.settings.extraRoleType,
    };
  }

  if (room.phase === "morning") {
    view.morning = {
      killedNames: room.lastMorning?.killedNames ?? [],
      noneKilled: (room.lastMorning?.killedNames.length ?? 0) === 0,
    };
  }

  if (room.phase === "day_questions" && room.daySubPhase) {
    const pair = room.dayPairs[room.dayPairIndex];
    const entry = room.dayQA[room.dayPairIndex];
    view.day = {
      subPhase: room.daySubPhase,
      pairIndex: room.dayPairIndex,
      totalPairs: room.dayPairs.length,
      askerId: pair?.asker,
      askerName: pair ? room.players[pair.asker]?.name : undefined,
      answererId: pair?.answerer,
      answererName: pair ? room.players[pair.answerer]?.name : undefined,
      isAsker: pair?.asker === me.id,
      isAnswerer: pair?.answerer === me.id,
      questionSubmitted: !!entry,
      answerSubmitted: !!entry?.answer,
    };
  }

  if (room.phase === "day_accusation") {
    view.accusation = {
      submitted: !!room.accusationSubmitted[me.id],
      canSubmit: me.alive,
    };
  }

  if (room.phase === "voting") {
    const choices = alivePlayers(room)
      .filter((p) => p.id !== me.id)
      .filter((p) => !room.revoteRound || !room.revoteCandidates || room.revoteCandidates.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name }));
    view.voting = {
      choices,
      myVote: room.votes[me.id],
      hasVoted: !!room.votes[me.id],
      isRevote: room.revoteRound,
    };
  }

  if (room.phase === "vote_reveal") {
    view.voteReveal = room.lastVoteReveal;
  }

  if (room.phase === "game_over") {
    const finalPlayers = room.playerOrder
      .map((id) => room.players[id])
      .filter((p): p is Player => !!p && !p.kicked)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar ?? null,
        role: p.role,
        roleInfo: p.role ? ROLE_INFO[p.role] : null,
        alive: p.alive,
      }));
    view.gameOver = {
      winner: room.winner,
      players: finalPlayers,
      nightLogs: room.nightLogs,
    };
  }

  return view;
}