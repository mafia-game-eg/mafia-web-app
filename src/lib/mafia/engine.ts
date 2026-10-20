import type {
  NightLogEntry,
  NightSubPhase,
  Player,
  Role,
  Room,
  VoteRevealResult,
} from "./types";
import { assignRoles } from "./roles";
import { generateId, pickRandom, shuffle } from "./utils";
import { deleteRoom, rooms } from "./store";

export const DURATIONS = {
  NIGHT_SUBPHASE: 15_000,
  MORNING: 8_000,
  QUESTION: 30_000,
  ANSWER: 30_000,
  ACCUSATION: 30_000,
  VOTING: 30_000,
  VOTE_REVEAL: 10_000,
  ROLE_REVEAL_MAX_WAIT: 90_000,
};

const DISCONNECT_THRESHOLD_MS = 12_000;
const HOST_MIGRATION_THRESHOLD_MS = 20_000;
const EMPTY_ROOM_TTL_MS = 5 * 60_000;
const STALE_ROOM_TTL_MS = 6 * 60 * 60_000;

export function alivePlayers(room: Room): Player[] {
  return room.playerOrder
    .map((id) => room.players[id])
    .filter((p): p is Player => !!p && p.alive && !p.kicked);
}

export function activePlayers(room: Room): Player[] {
  return room.playerOrder
    .map((id) => room.players[id])
    .filter((p): p is Player => !!p && !p.kicked);
}

function findRoleHolder(room: Room, role: Role): Player | undefined {
  return activePlayers(room).find((p) => p.role === role);
}

function touchActivity(room: Room) {
  room.lastActivityAt = Date.now();
}

export function pushSystemChat(room: Room, text: string) {
  room.chatLog.push({
    id: generateId(),
    type: "system",
    fromId: null,
    fromName: null,
    text,
    createdAt: Date.now(),
  });
}

function checkWin(room: Room): "citizens" | "mafia" | null {
  const alive = alivePlayers(room);
  const mafiaAlive = alive.filter((p) => p.role === "mafia").length;
  const othersAlive = alive.length - mafiaAlive;
  if (mafiaAlive === 0) return "citizens";
  if (mafiaAlive >= othersAlive) return "mafia";
  return null;
}

function endGame(room: Room, winner: "citizens" | "mafia") {
  room.phase = "game_over";
  room.winner = winner;
  room.phaseEndsAt = null;
  for (const p of activePlayers(room)) {
    if (p.role) room.revealedRoles[p.id] = p.role;
  }
  pushSystemChat(
    room,
    winner === "citizens"
      ? "🎉 انتهت اللعبة! فاز المواطنون الصالحون."
      : "🔪 انتهت اللعبة! فازت المافيا.",
  );
}

function startNight(room: Room, isFirst: boolean) {
  room.phase = "night";
  room.nightNumber = isFirst ? 1 : room.nightNumber + 1;
  room.nightSubPhase = room.nightSubPhaseSequence[0] ?? "mafia";
  room.mafiaVotes = {};
  room.doctorSaveChoice = null;
  room.detectiveChoices = {};
  room.extraSaveChoice = null;
  room.sniperResolution = null;
  room.pendingVictim = null;
  room.phaseEndsAt = Date.now() + DURATIONS.NIGHT_SUBPHASE;
  pushSystemChat(room, `🌙 نزل الليل رقم ${room.nightNumber}... الكل نايم.`);
}

export function startGameFlow(room: Room) {
  const players = activePlayers(room);
  const { sequence } = assignRoles(players, room.settings);
  room.nightSubPhaseSequence = sequence as NightSubPhase[];
  room.gameStarted = true;
  room.phase = "role_reveal";
  room.phaseEndsAt = Date.now() + DURATIONS.ROLE_REVEAL_MAX_WAIT;
  room.nightNumber = 0;
  room.nightLogs = [];
  room.revealedRoles = {};
  room.chatLog = [];
  room.previousDoctorSave = null;
  for (const p of players) {
    p.ready = false;
    p.alive = true;
    p.sniperUsed = false;
    p.investigations = [];
  }
  touchActivity(room);
}

function advanceNightSubPhase(room: Room) {
  const seq = room.nightSubPhaseSequence;
  const currentIndex = seq.indexOf(room.nightSubPhase as NightSubPhase);

  if (room.nightSubPhase === "mafia") {
    resolveMafiaVotes(room);
  } else if (room.nightSubPhase === "doctor") {
    resolveDoctor(room);
  } else if (room.nightSubPhase === "detective") {
    resolveDetective(room);
  } else if (room.nightSubPhase === "extra") {
    resolveExtra(room);
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex < seq.length) {
    room.nightSubPhase = seq[nextIndex];
    room.phaseEndsAt = Date.now() + DURATIONS.NIGHT_SUBPHASE;
  } else {
    resolveNightEnd(room);
  }
}

function resolveMafiaVotes(room: Room) {
  const mafiaAlive = alivePlayers(room).filter((p) => p.role === "mafia");
  const tally = new Map<string, number>();
  for (const m of mafiaAlive) {
    const target = room.mafiaVotes[m.id];
    if (target) tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  let best: string[] = [];
  let bestCount = 0;
  for (const [target, count] of tally.entries()) {
    if (count > bestCount) {
      best = [target];
      bestCount = count;
    } else if (count === bestCount) {
      best.push(target);
    }
  }
  room.pendingVictim = best.length ? (pickRandom(best) ?? null) : null;
}

function resolveDoctor(room: Room) {
  const doctor = alivePlayers(room).find((p) => p.role === "doctor");
  if (doctor) {
    room.previousDoctorSave = room.doctorSaveChoice;
  }
}

function resolveDetective(room: Room) {
  const detective = alivePlayers(room).find((p) => p.role === "detective");
  if (!detective) return;
  const targetId = room.detectiveChoices[detective.id];
  if (!targetId) return;
  const target = room.players[targetId];
  if (!target) return;
  detective.investigations.push({
    night: room.nightNumber,
    targetId: target.id,
    targetName: target.name,
    isMafia: target.role === "mafia",
  });
}

function resolveExtra(room: Room) {
  if (room.settings.extraRoleType === "bodyguard") {
    return;
  }
  const sniper = alivePlayers(room).find((p) => p.role === "sniper");
  if (!sniper || sniper.sniperUsed) return;
  const targetId = room.extraSaveChoice;
  if (!targetId || targetId === "skip") return;
  const target = room.players[targetId];
  if (!target) return;
  sniper.sniperUsed = true;
  room.sniperResolution = {
    targetId,
    killedMafia: target.role === "mafia",
  };
}

function resolveNightEnd(room: Room) {
  const killed = new Set<string>();
  let savedName: string | null = null;

  if (room.pendingVictim) {
    const savedByDoctor = room.doctorSaveChoice === room.pendingVictim;
    const savedByGuard =
      room.settings.extraRoleType === "bodyguard" &&
      room.extraSaveChoice === room.pendingVictim;
    if (savedByDoctor || savedByGuard) {
      const victim = room.players[room.pendingVictim];
      savedName = victim ? victim.name : null;
    } else {
      killed.add(room.pendingVictim);
    }
  }

  if (room.sniperResolution) {
    if (room.sniperResolution.killedMafia) {
      killed.add(room.sniperResolution.targetId);
    } else {
      const sniper = activePlayers(room).find((p) => p.role === "sniper");
      if (sniper) killed.add(sniper.id);
    }
  }

  const killedNames: string[] = [];
  for (const id of killed) {
    const p = room.players[id];
    if (p) {
      p.alive = false;
      killedNames.push(p.name);
      if (room.settings.revealRoleOnDeath && p.role) {
        room.revealedRoles[p.id] = p.role;
      }
    }
  }

  const entry: NightLogEntry = {
    night: room.nightNumber,
    killedIds: [...killed],
    killedNames,
    savedName,
  };
  room.nightLogs.push(entry);
  room.lastMorning = { killedNames };

  const winner = checkWin(room);
  if (winner) {
    endGame(room, winner);
    return;
  }

  room.phase = "morning";
  room.nightSubPhase = null;
  room.phaseEndsAt = Date.now() + DURATIONS.MORNING;
}

function buildDayPairs(room: Room) {
  const aliveIds = alivePlayers(room).map((p) => p.id);
  room.dayPairs = [];
  room.dayQA = [];
  room.dayPairIndex = 0;
  room.daySubPhase = null;
  if (aliveIds.length < 2) return;
  const count = Math.max(1, Math.min(room.settings.questionPairs, aliveIds.length * 2));
  for (let i = 0; i < count; i++) {
    const asker = pickRandom(aliveIds);
    let answerer = pickRandom(aliveIds);
    let guard = 0;
    while (answerer === asker && guard < 10) {
      answerer = pickRandom(aliveIds);
      guard++;
    }
    if (asker && answerer && asker !== answerer) {
      room.dayPairs.push({ asker, answerer });
    }
  }
}

function startAccusationPhase(room: Room) {
  room.phase = "day_accusation";
  room.accusationSubmitted = {};
  room.phaseEndsAt = Date.now() + DURATIONS.ACCUSATION;
  pushSystemChat(room, "🗣️ وقت الاتهامات بدأ! يمكن لكل لاعب إرسال رسالة واحدة قصيرة.");
}

function startVotingPhase(room: Room) {
  room.phase = "voting";
  room.votes = {};
  room.phaseEndsAt = Date.now() + DURATIONS.VOTING;
  pushSystemChat(room, "🗳️ وقت التصويت! صوّتوا لمن تعتقدون أنه من المافيا.");
}

function startNextDayQuestionStep(room: Room) {
  if (room.dayPairIndex >= room.dayPairs.length) {
    startAccusationPhase(room);
    return;
  }
  room.phase = "day_questions";
  room.daySubPhase = "question";
  room.phaseEndsAt = Date.now() + DURATIONS.QUESTION;
}

function advanceFromMorning(room: Room) {
  buildDayPairs(room);
  if (room.dayPairs.length === 0) {
    startAccusationPhase(room);
  } else {
    startNextDayQuestionStep(room);
  }
}

function advanceDayQuestionStep(room: Room) {
  const pair = room.dayPairs[room.dayPairIndex];
  if (room.daySubPhase === "question") {
    const existing = room.dayQA[room.dayPairIndex];
    if (!existing) {
      const asker = room.players[pair.asker];
      const answerer = room.players[pair.answerer];
      room.dayQA.push({
        askerId: pair.asker,
        askerName: asker?.name ?? "",
        answererId: pair.answerer,
        answererName: answerer?.name ?? "",
        question: "(لم يُجب في الوقت المحدد)",
        answer: null,
      });
      pushSystemChat(
        room,
        `${asker?.name ?? "لاعب"} لم يطرح سؤالًا في الوقت المحدد.`,
      );
    }
    room.daySubPhase = "answer";
    room.phaseEndsAt = Date.now() + DURATIONS.ANSWER;
  } else {
    const entry = room.dayQA[room.dayPairIndex];
    if (entry && entry.answer === null) {
      entry.answer = "(لم يُجب في الوقت المحدد)";
      pushSystemChat(
        room,
        `${entry.answererName} لم يُجب في الوقت المحدد.`,
      );
    }
    room.dayPairIndex++;
    startNextDayQuestionStep(room);
  }
}

function tallyVotes(room: Room): {
  tally: Map<string, number>;
  results: { voterName: string; targetName: string }[];
} {
  const tally = new Map<string, number>();
  const results: { voterName: string; targetName: string }[] = [];
  for (const voter of alivePlayers(room)) {
    const target = room.votes[voter.id] ?? "abstain";
    if (target !== "abstain") {
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    const targetName =
      target === "abstain" ? "امتناع" : (room.players[target]?.name ?? "غير معروف");
    results.push({ voterName: voter.name, targetName });
  }
  return { tally, results };
}

function advanceFromVoting(room: Room) {
  const { tally, results } = tallyVotes(room);
  let best: string[] = [];
  let bestCount = 0;
  for (const [target, count] of tally.entries()) {
    if (count > bestCount) {
      best = [target];
      bestCount = count;
    } else if (count === bestCount) {
      best.push(target);
    }
  }

  const tallyArr = [...tally.entries()].map(([id, count]) => ({
    name: room.players[id]?.name ?? "غير معروف",
    count,
  }));

  if (bestCount === 0) {
    room.lastVoteReveal = {
      tally: tallyArr,
      results,
      eliminatedName: null,
      eliminatedId: null,
      tie: false,
      revote: false,
    };
    room.phase = "vote_reveal";
    room.phaseEndsAt = Date.now() + DURATIONS.VOTE_REVEAL;
    return;
  }

  if (best.length > 1) {
    if (room.settings.revoteOnTie && !room.revoteRound) {
      room.lastVoteReveal = {
        tally: tallyArr,
        results,
        eliminatedName: null,
        eliminatedId: null,
        tie: true,
        revote: true,
      };
      room.revoteRound = true;
      room.revoteCandidates = best;
      room.phase = "vote_reveal";
      room.phaseEndsAt = Date.now() + DURATIONS.VOTE_REVEAL;
      return;
    }
    room.lastVoteReveal = {
      tally: tallyArr,
      results,
      eliminatedName: null,
      eliminatedId: null,
      tie: true,
      revote: false,
    };
    room.phase = "vote_reveal";
    room.phaseEndsAt = Date.now() + DURATIONS.VOTE_REVEAL;
    return;
  }

  const eliminatedId = best[0];
  const eliminated = room.players[eliminatedId];
  room.lastVoteReveal = {
    tally: tallyArr,
    results,
    eliminatedName: eliminated?.name ?? null,
    eliminatedId,
    tie: false,
    revote: false,
  };
  room.phase = "vote_reveal";
  room.phaseEndsAt = Date.now() + DURATIONS.VOTE_REVEAL;
}

function advanceFromVoteReveal(room: Room) {
  const reveal = room.lastVoteReveal;
  if (reveal?.eliminatedId) {
    const player = room.players[reveal.eliminatedId];
    if (player) {
      player.alive = false;
      if (player.role) room.revealedRoles[player.id] = player.role;
      pushSystemChat(
        room,
        `⚖️ تم إعدام ${player.name}. كان دوره: ${player.role ? player.role : "غير معروف"}.`,
      );
    }
  } else if (reveal?.revote && room.revoteCandidates) {
    room.votes = {};
    room.phase = "voting";
    room.phaseEndsAt = Date.now() + DURATIONS.VOTING;
    return;
  } else {
    pushSystemChat(room, "⚖️ تعادل الأصوات، لم يتم إعدام أحد.");
  }

  room.revoteRound = false;
  room.revoteCandidates = null;

  const winner = checkWin(room);
  if (winner) {
    endGame(room, winner);
    return;
  }

  startNight(room, false);
}

export function forceAdvance(room: Room) {
  switch (room.phase) {
    case "role_reveal": {
      startNight(room, true);
      break;
    }
    case "night": {
      advanceNightSubPhase(room);
      break;
    }
    case "morning": {
      advanceFromMorning(room);
      break;
    }
    case "day_questions": {
      advanceDayQuestionStep(room);
      break;
    }
    case "day_accusation": {
      startVotingPhase(room);
      break;
    }
    case "voting": {
      advanceFromVoting(room);
      break;
    }
    case "vote_reveal": {
      advanceFromVoteReveal(room);
      break;
    }
    default:
      break;
  }
}

export function maybeEarlyAdvance(room: Room) {
  if (room.phase === "day_questions" && room.daySubPhase) {
    const pair = room.dayPairs[room.dayPairIndex];
    if (!pair) return;
    if (room.daySubPhase === "question") {
      const existing = room.dayQA[room.dayPairIndex];
      if (existing) forceAdvance(room);
    } else if (room.daySubPhase === "answer") {
      const existing = room.dayQA[room.dayPairIndex];
      if (existing && existing.answer !== null) forceAdvance(room);
    }
  } else if (room.phase === "day_accusation") {
    const alive = alivePlayers(room);
    if (alive.length > 0 && alive.every((p) => room.accusationSubmitted[p.id])) {
      forceAdvance(room);
    }
  } else if (room.phase === "voting") {
    const alive = alivePlayers(room);
    if (alive.length > 0 && alive.every((p) => room.votes[p.id])) {
      forceAdvance(room);
    }
  }
}

function handleHostMigration(room: Room) {
  const host = room.players[room.hostId];
  const now = Date.now();
  if (!host || host.kicked || (!host.connected && now - host.lastSeen > HOST_MIGRATION_THRESHOLD_MS)) {
    const candidates = activePlayers(room)
      .filter((p) => p.id !== room.hostId)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = candidates.find((p) => p.connected) ?? candidates[0];
    if (next) {
      if (host) host.isHost = false;
      next.isHost = true;
      room.hostId = next.id;
      pushSystemChat(room, `👑 ${next.name} أصبح مضيف الغرفة الجديد.`);
    }
  }
}

function updateConnectionStatuses(room: Room) {
  const now = Date.now();
  for (const p of activePlayers(room)) {
    if (p.connected && now - p.lastSeen > DISCONNECT_THRESHOLD_MS) {
      p.connected = false;
    }
  }
}

export function tickRoom(room: Room) {
  updateConnectionStatuses(room);
  if (room.phase !== "lobby") {
    handleHostMigration(room);
  }

  if (room.phase === "lobby" || room.phase === "game_over") return;

  maybeEarlyAdvance(room);

  if (room.phaseEndsAt !== null && Date.now() >= room.phaseEndsAt) {
    forceAdvance(room);
  }
}

export function tickAllRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    try {
      tickRoom(room);
    } catch {
      // swallow errors from a single room so the loop keeps running
    }

    const allDisconnected = activePlayers(room).every((p) => !p.connected);
    const isEmpty = activePlayers(room).length === 0;
    if (
      (isEmpty && now - room.lastActivityAt > 30_000) ||
      (allDisconnected && now - room.lastActivityAt > EMPTY_ROOM_TTL_MS) ||
      now - room.lastActivityAt > STALE_ROOM_TTL_MS
    ) {
      deleteRoom(code);
    }
  }
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function ensureEngineRunning() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    tickAllRooms();
  }, 1000);
  if (typeof tickInterval === "object" && tickInterval && "unref" in tickInterval) {
    (tickInterval as NodeJS.Timeout).unref?.();
  }
}

export function resetRoomToLobby(room: Room) {
  room.phase = "lobby";
  room.nightSubPhase = null;
  room.daySubPhase = null;
  room.gameStarted = false;
  room.winner = null;
  room.phaseEndsAt = null;
  room.nightNumber = 0;
  room.mafiaVotes = {};
  room.doctorSaveChoice = null;
  room.previousDoctorSave = null;
  room.detectiveChoices = {};
  room.extraSaveChoice = null;
  room.sniperResolution = null;
  room.pendingVictim = null;
  room.nightLogs = [];
  room.revealedRoles = {};
  room.dayPairs = [];
  room.dayPairIndex = 0;
  room.dayQA = [];
  room.accusationSubmitted = {};
  room.chatLog = [];
  room.votes = {};
  room.revoteRound = false;
  room.revoteCandidates = null;
  room.lastVoteReveal = null;
  room.lastMorning = null;
  for (const p of activePlayers(room)) {
    p.ready = false;
    p.alive = true;
    p.role = null;
    p.sniperUsed = false;
    p.investigations = [];
  }
  touchActivity(room);
}

export { checkWin, findRoleHolder };
