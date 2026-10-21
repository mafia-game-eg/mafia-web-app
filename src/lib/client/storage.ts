export interface SessionInfo {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
  savedAt?: number;
}

const SESSION_PREFIX = "mafia_session_";
const LAST_NAME_KEY = "mafia_last_name";

export function saveSession(info: SessionInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SESSION_PREFIX + info.roomCode.toUpperCase(),
    JSON.stringify({ ...info, savedAt: Date.now() }),
  );
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
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// كل الجلسات المحفوظة (الأحدث أولًا)، بتتجاهل القديمة جدًا
export function listSessions(): SessionInfo[] {
  if (typeof window === "undefined") return [];
  const out: SessionInfo[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(SESSION_PREFIX)) continue;
    try {
      const s = JSON.parse(localStorage.getItem(key) ?? "") as SessionInfo;
      if (!s || !s.roomCode || !s.playerId || !s.token) continue;
      if (s.savedAt && Date.now() - s.savedAt > SESSION_MAX_AGE_MS) continue;
      out.push(s);
    } catch {
      // تجاهل أي بيانات تالفة
    }
  }
  return out.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function clearSession(roomCode: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_PREFIX + roomCode.toUpperCase());
}

export function getLastName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_NAME_KEY) ?? "";
}
