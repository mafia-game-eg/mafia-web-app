import type { ExtraRoleType, Player, Room, RoomSettings } from "./types";
import { generateId, generateRoomCode, clamp } from "./utils";
import { rooms, getRoom } from "./store";
import {
  DURATIONS,
  activePlayers,
  alivePlayers,
  ensureEngineRunning,
  forceAdvance,
  maybeEarlyAdvance,
  pushSystemChat,
  resetRoomToLobby,
  startGameFlow,
} from "./engine";

export class GameError extends Error {}

function sanitizeAvatar(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  if (v.length > 12000) return null;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return null;
  return v;
}

function newPlayer(name: string, isHost: boolean, avatar: string | null = null): Player {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    avatar,
    token: generateId(),
    isHost,
    joinedAt: now,
    connected: true,
    lastSeen: now,
    ready: false,
    alive: true,
    role: null,
    kicked: false,
    sniperUsed: false,
    investigations: [],
  };
}

export function createRoom(input: {
  playerName: string;
  avatar?: string | null;
  maxPlayers: number;
  revealRoleOnDeath: boolean;
  questionPairs: number;
  revoteOnTie: boolean;
  extraRoleType: ExtraRoleType;
}): { room: Room; player: Player } {
  ensureEngineRunning();
  const name = input.playerName.trim().slice(0, 20);
  if (!name) throw new GameError("من فضلك اكتب اسمك أولًا.");

  let code = generateRoomCode();
  let guard = 0;
  while (rooms.has(code) && guard < 20) {
    code = generateRoomCode();
    guard++;
  }

  const settings: RoomSettings = {
    maxPlayers: clamp(Math.round(input.maxPlayers), 5, 20),
    revealRoleOnDeath: !!input.revealRoleOnDeath,
    questionPairs: clamp(Math.round(input.questionPairs) || 3, 1, 8),
    revoteOnTie: input.revoteOnTie !== false,
    extraRoleType: input.extraRoleType === "sniper" ? "sniper" : "bodyguard",
  };

  const host = newPlayer(name, true, sanitizeAvatar(input.avatar));
  const now = Date.now();
  const room: Room = {
    code,
    hostId: host.id,
    settings,
    players: { [host.id]: host },
    playerOrder: [host.id],
    phase: "lobby",
    nightSubPhase: null,
    nightSubPhaseSequence: [],
    nightNumber: 0,
    daySubPhase: null,
    phaseEndsAt: null,
    createdAt: now,
    lastActivityAt: now,
    gameStarted: false,
    winner: null,
    mafiaVotes: {},
    doctorSaveChoice: null,
    previousDoctorSave: null,
    detectiveChoices: {},
    extraSaveChoice: null,
    sniperResolution: null,
    pendingVictim: null,
    nightLogs: [],
    revealedRoles: {},
    dayPairs: [],
    dayPairIndex: 0,
    dayQA: [],
    accusationSubmitted: {},
    chatLog: [],
    votes: {},
    revoteRound: false,
    revoteCandidates: null,
    lastVoteReveal: null,
    lastMorning: null,
  };

  rooms.set(code, room);
  return { room, player: host };
}

export function joinRoom(input: {
  roomCode: string;
  playerName: string;
  avatar?: string | null;
  token?: string;
  playerId?: string;
}): { room: Room; player: Player; reconnected: boolean } {
  ensureEngineRunning();
  const room = getRoom(input.roomCode);
  if (!room) throw new GameError("الغرفة غير موجودة. تأكد من الكود.");

  if (input.token && input.playerId) {
    const existing = room.players[input.playerId];
    if (existing && existing.token === input.token) {
      if (existing.kicked) throw new GameError("تم طردك من هذه الغرفة.");
      existing.connected = true;
      existing.lastSeen = Date.now();
      room.lastActivityAt = Date.now();
      return { room, player: existing, reconnected: true };
    }
  }

  const name = input.playerName.trim().slice(0, 20);
  if (!name) throw new GameError("من فضلك اكتب اسمك أولًا.");

  if (room.gameStarted) {
    throw new GameError("اللعبة بدأت بالفعل في هذه الغرفة، لا يمكنك الانضمام الآن.");
  }

  const active = activePlayers(room);
  if (active.length >= room.settings.maxPlayers) {
    throw new GameError("الغرفة مكتملة العدد بالفعل.");
  }
  if (active.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    throw new GameError("هذا الاسم مستخدم بالفعل في هذه الغرفة، اختر اسمًا آخر.");
  }

  const player = newPlayer(name, active.length === 0, sanitizeAvatar(input.avatar));
  room.players[player.id] = player;
  room.playerOrder.push(player.id);
  room.lastActivityAt = Date.now();
  pushSystemChat(room, `👋 ${player.name} انضم إلى الغرفة.`);

  if (active.length + 1 >= room.settings.maxPlayers) {
    startGameFlow(room);
  }

  return { room, player, reconnected: false };
}

function requirePlayer(room: Room, playerId: string, token: string): Player {
  const player = room.players[playerId];
  if (!player || player.token !== token) {
    throw new GameError("جلستك غير صالحة، حاول الدخول من جديد.");
  }
  if (player.kicked) throw new GameError("تم طردك من هذه الغرفة.");
  player.connected = true;
  player.lastSeen = Date.now();
  room.lastActivityAt = Date.now();
  return player;
}

export function requireRoom(roomCode: string): Room {
  const room = getRoom(roomCode);
  if (!room) throw new GameError("الغرفة لم تعد موجودة، ربما انتهت صلاحيتها أو امتلأت بالفعل.");
  return room;
}

export function touchPlayer(roomCode: string, playerId: string, token: string): Room {
  const room = getRoom(roomCode);
  if (!room) throw new GameError("الغرفة لم تعد موجودة، ربما انتهت صلاحيتها.");
  requirePlayer(room, playerId, token);
  return room;
}

export function kickPlayer(
  roomCode: string,
  hostId: string,
  hostToken: string,
  targetId: string,
): Room {
  const room = getRoom(roomCode);
  if (!room) throw new GameError("الغرفة غير موجودة.");
  const host = requirePlayer(room, hostId, hostToken);
  if (room.hostId !== host.id) throw new GameError("فقط المضيف يمكنه الطرد.");
  if (room.phase !== "lobby") throw new GameError("لا يمكن الطرد إلا أثناء الانتظار.");
  const target = room.players[targetId];
  if (!target) throw new GameError("اللاعب غير موجود.");
  if (target.id === host.id) throw new GameError("لا يمكنك طرد نفسك.");
  delete room.players[targetId];
  room.playerOrder = room.playerOrder.filter((id) => id !== targetId);
  pushSystemChat(room, `🚪 تم طرد ${target.name} من الغرفة.`);
  return room;
}

export function startGameNow(room: Room, hostId: string, hostToken: string): Room {
  const host = requirePlayer(room, hostId, hostToken);
  if (room.hostId !== host.id) throw new GameError("فقط المضيف يمكنه بدء اللعبة.");
  if (room.phase !== "lobby") throw new GameError("اللعبة بدأت بالفعل.");
  const active = activePlayers(room);
  if (active.length < 5) throw new GameError("تحتاج 5 لاعبين على الأقل لبدء اللعبة.");
  startGameFlow(room);
  return room;
}

export function setReady(room: Room, playerId: string, token: string): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "role_reveal") throw new GameError("لا يمكن الاستعداد الآن.");
  player.ready = true;
  const active = activePlayers(room);
  if (active.length > 0 && active.every((p) => p.ready)) {
    forceAdvance(room);
  }
  return room;
}

export function submitNightAction(
  room: Room,
  playerId: string,
  token: string,
  targetId: string,
): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "night") throw new GameError("ليس وقت الاختيار الآن.");
  if (!player.alive) return room; // spectators: silently ignore

  const sub = room.nightSubPhase;
  if (sub === "mafia") {
    if (player.role === "mafia" && room.players[targetId]?.alive) {
      room.mafiaVotes[player.id] = targetId;
    }
  } else if (sub === "doctor") {
    if (player.role === "doctor") {
      if (targetId === room.previousDoctorSave) {
        throw new GameError("لا يمكنك إنقاذ نفس الشخص ليلتين متتاليتين.");
      }
      if (room.players[targetId]?.alive || targetId === player.id) {
        room.doctorSaveChoice = targetId;
      }
    }
  } else if (sub === "detective") {
    if (player.role === "detective") {
      if (room.players[targetId]?.alive) {
        room.detectiveChoices[player.id] = targetId;
      }
    }
  } else if (sub === "extra") {
    if (player.role === "bodyguard") {
      if (room.players[targetId]?.alive || targetId === player.id) {
        room.extraSaveChoice = targetId;
      }
    } else if (player.role === "sniper") {
      if (!player.sniperUsed) {
        if (targetId === "skip") {
          room.extraSaveChoice = "skip";
        } else if (room.players[targetId]?.alive) {
          room.extraSaveChoice = targetId;
        }
      }
    }
  }
  // all other players: fake / no-op choice, intentionally ignored.
  return room;
}

export function submitQuestion(
  room: Room,
  playerId: string,
  token: string,
  text: string,
): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "day_questions" || room.daySubPhase !== "question") {
    throw new GameError("ليس وقت طرح السؤال الآن.");
  }
  const pair = room.dayPairs[room.dayPairIndex];
  if (!pair || pair.asker !== player.id) throw new GameError("ليس دورك لطرح السؤال.");
  if (room.dayQA[room.dayPairIndex]) throw new GameError("تم إرسال السؤال بالفعل.");
  const clean = text.trim().slice(0, 140);
  if (!clean) throw new GameError("اكتب سؤالًا صالحًا.");
  const asker = room.players[pair.asker];
  const answerer = room.players[pair.answerer];
  room.dayQA.push({
    askerId: pair.asker,
    askerName: asker?.name ?? "",
    answererId: pair.answerer,
    answererName: answerer?.name ?? "",
    question: clean,
    answer: null,
  });
  pushSystemChat(room, `${asker?.name ?? ""} سأل ${answerer?.name ?? ""}:`);
  room.chatLog.push({
    id: generateId(),
    type: "qa_question",
    fromId: player.id,
    fromName: asker?.name ?? "",
    text: clean,
    createdAt: Date.now(),
  });
  maybeEarlyAdvance(room);
  return room;
}

export function submitAnswer(
  room: Room,
  playerId: string,
  token: string,
  text: string,
): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "day_questions" || room.daySubPhase !== "answer") {
    throw new GameError("ليس وقت الإجابة الآن.");
  }
  const pair = room.dayPairs[room.dayPairIndex];
  if (!pair || pair.answerer !== player.id) throw new GameError("ليس دورك للإجابة.");
  const entry = room.dayQA[room.dayPairIndex];
  if (!entry || entry.answer !== null) throw new GameError("تم إرسال الإجابة بالفعل.");
  const clean = text.trim().slice(0, 140);
  if (!clean) throw new GameError("اكتب إجابة صالحة.");
  entry.answer = clean;
  room.chatLog.push({
    id: generateId(),
    type: "qa_answer",
    fromId: player.id,
    fromName: entry.answererName,
    text: clean,
    createdAt: Date.now(),
  });
  maybeEarlyAdvance(room);
  return room;
}

export function submitAccusation(
  room: Room,
  playerId: string,
  token: string,
  text: string,
): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "day_accusation") throw new GameError("ليس وقت الاتهامات الآن.");
  if (!player.alive) throw new GameError("لا يمكن للمتفرجين المشاركة.");
  if (room.accusationSubmitted[player.id]) {
    throw new GameError("لقد أرسلت رسالتك بالفعل في هذه الجولة.");
  }
  const clean = text.trim().slice(0, 100);
  if (!clean) throw new GameError("اكتب رسالة صالحة.");
  room.accusationSubmitted[player.id] = true;
  room.chatLog.push({
    id: generateId(),
    type: "accusation",
    fromId: player.id,
    fromName: player.name,
    text: clean,
    createdAt: Date.now(),
  });
  maybeEarlyAdvance(room);
  return room;
}

export function submitVote(
  room: Room,
  playerId: string,
  token: string,
  targetId: string,
): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase !== "voting") throw new GameError("ليس وقت التصويت الآن.");
  if (!player.alive) throw new GameError("لا يمكن للمتفرجين التصويت.");
  if (targetId === player.id) throw new GameError("لا يمكنك التصويت لنفسك.");
  if (room.revoteRound && room.revoteCandidates) {
    if (targetId !== "abstain" && !room.revoteCandidates.includes(targetId)) {
      throw new GameError("التصويت الآن مقتصر على المتعادلين فقط.");
    }
  }
  if (targetId !== "abstain") {
    const target = room.players[targetId];
    if (!target || !target.alive) throw new GameError("لا يمكن التصويت لهذا اللاعب.");
  }
  room.votes[player.id] = targetId;
  maybeEarlyAdvance(room);
  return room;
}

export function playAgain(room: Room, hostId: string, hostToken: string): Room {
  const host = requirePlayer(room, hostId, hostToken);
  if (room.hostId !== host.id) throw new GameError("فقط المضيف يمكنه بدء جولة جديدة.");
  if (room.phase !== "game_over") throw new GameError("اللعبة لم تنتهِ بعد.");
  resetRoomToLobby(room);
  return room;
}

export function leaveRoom(room: Room, playerId: string, token: string): Room {
  const player = requirePlayer(room, playerId, token);
  if (room.phase === "lobby") {
    delete room.players[playerId];
    room.playerOrder = room.playerOrder.filter((id) => id !== playerId);
    pushSystemChat(room, `🚪 ${player.name} غادر الغرفة.`);
  } else {
    player.connected = false;
  }
  return room;
}
export function updateProfile(
  room: Room,
  playerId: string,
  token: string,
  input: { name?: string; avatar?: string | null },
): Room {
  const player = requirePlayer(room, playerId, token);
  if (input.avatar !== undefined) {
    player.avatar = sanitizeAvatar(input.avatar);
  }
  if (input.name !== undefined) {
    if (room.phase !== "lobby") throw new GameError("لا يمكن تغيير الاسم بعد بدء اللعبة.");
    const name = input.name.trim().slice(0, 20);
    if (!name) throw new GameError("من فضلك اكتب اسمك أولًا.");
    const taken = activePlayers(room).some(
      (p) => p.id !== player.id && p.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) throw new GameError("هذا الاسم مستخدم بالفعل في هذه الغرفة، اختر اسمًا آخر.");
    player.name = name;
  }
  return room;
}