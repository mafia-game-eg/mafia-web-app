export type Role =
  | "mafia"
  | "doctor"
  | "detective"
  | "bodyguard"
  | "sniper"
  | "citizen";

export type ExtraRoleType = "bodyguard" | "sniper";

export type Phase =
  | "lobby"
  | "role_reveal"
  | "night"
  | "morning"
  | "day_questions"
  | "day_accusation"
  | "voting"
  | "vote_reveal"
  | "game_over";

export type NightSubPhase = "mafia" | "doctor" | "detective" | "extra";

export type DaySubPhase = "question" | "answer";

export interface Investigation {
  night: number;
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string | null;
  token: string;
  isHost: boolean;
  joinedAt: number;
  connected: boolean;
  lastSeen: number;
  ready: boolean;
  alive: boolean;
  role: Role | null;
  kicked: boolean;
  sniperUsed: boolean;
  investigations: Investigation[];
}

export interface RoomSettings {
  maxPlayers: number;
  revealRoleOnDeath: boolean;
  questionPairs: number;
  revoteOnTie: boolean;
  extraRoleType: ExtraRoleType;
}

export interface ChatMessage {
  id: string;
  type: "qa_question" | "qa_answer" | "accusation" | "system";
  fromId: string | null;
  fromName: string | null;
  text: string;
  createdAt: number;
  night?: number;
}

export interface NightLogEntry {
  night: number;
  killedIds: string[];
  killedNames: string[];
  savedName: string | null;
}

export interface DayQAEntry {
  askerId: string;
  askerName: string;
  answererId: string;
  answererName: string;
  question: string | null;
  answer: string | null;
}

export interface VoteRevealResult {
  tally: { name: string; count: number }[];
  results: { voterName: string; targetName: string }[];
  eliminatedName: string | null;
  eliminatedId: string | null;
  tie: boolean;
  revote: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  settings: RoomSettings;
  players: Record<string, Player>;
  playerOrder: string[];

  phase: Phase;
  nightSubPhase: NightSubPhase | null;
  nightSubPhaseSequence: NightSubPhase[];
  nightNumber: number;
  daySubPhase: DaySubPhase | null;

  phaseEndsAt: number | null;

  createdAt: number;
  lastActivityAt: number;
  gameStarted: boolean;
  winner: "citizens" | "mafia" | null;

  // night transient state
  mafiaVotes: Record<string, string>;
  doctorSaveChoice: string | null;
  previousDoctorSave: string | null;
  detectiveChoices: Record<string, string>;
  extraSaveChoice: string | null;
  sniperResolution: { targetId: string; killedMafia: boolean } | null;
  pendingVictim: string | null;

  nightLogs: NightLogEntry[];
  revealedRoles: Record<string, Role>;

  // day state
  dayPairs: { asker: string; answerer: string }[];
  dayPairIndex: number;
  dayQA: DayQAEntry[];
  accusationSubmitted: Record<string, boolean>;
  chatLog: ChatMessage[];

  // voting state
  votes: Record<string, string>;
  revoteRound: boolean;
  revoteCandidates: string[] | null;
  lastVoteReveal: VoteRevealResult | null;

  lastMorning: { killedNames: string[] } | null;
}

export interface RoleInfo {
  title: string;
  description: string;
  icon: string;
  team: "mafia" | "town";
}
