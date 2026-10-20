export interface SessionInfo {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
}

const SESSION_PREFIX = "mafia_session_";
const LAST_NAME_KEY = "mafia_last_name";

export function saveSession(info: SessionInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_PREFIX + info.roomCode.toUpperCase(), JSON.stringify(info));
  localStorage.setItem(LAST_NAME_KEY, info.name);
}

export function loadSession(roomCode: string): SessionInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_PREFIX + roomCode.toUpperCase());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionInfo;
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_PREFIX + roomCode.toUpperCase());
}

export function getLastName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_NAME_KEY) ?? "";
}
