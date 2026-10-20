import type { PlayerView } from "@/lib/mafia/view";

export interface ApiOk<T = Record<string, unknown>> {
  ok: true;
  view?: PlayerView;
  [key: string]: unknown;
}
export interface ApiErr {
  ok: false;
  error: string;
}
export type ApiResult<T = Record<string, unknown>> = (ApiOk<T> & T) | ApiErr;

async function post<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/game/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  } catch {
    return { ok: false, error: "تعذر الاتصال بالسيرفر، تحقق من اتصالك بالإنترنت." };
  }
}

export const api = {
  create: (body: {
    playerName: string;
    avatar?: string | null;
    maxPlayers: number;
    revealRoleOnDeath: boolean;
    questionPairs: number;
    revoteOnTie: boolean;
    extraRoleType: "bodyguard" | "sniper";
  }) =>
    post<{ roomCode: string; playerId: string; token: string }>("create", body),

  join: (body: {
    roomCode: string;
    playerName: string;
    avatar?: string | null;
    token?: string;
    playerId?: string;
  }) =>
    post<{ roomCode: string; playerId: string; token: string; reconnected: boolean }>(
      "join",
      body,
    ),

  state: async (roomCode: string, playerId: string, token: string): Promise<ApiResult> => {
    try {
      const params = new URLSearchParams({ roomCode, playerId, token });
      const res = await fetch(`/api/game/state?${params.toString()}`, { cache: "no-store" });
      return await res.json();
    } catch {
      return { ok: false, error: "تعذر الاتصال بالسيرفر، تحقق من اتصالك بالإنترنت." };
    }
  },

  ready: (roomCode: string, playerId: string, token: string) =>
    post("ready", { roomCode, playerId, token }),

  start: (roomCode: string, playerId: string, token: string) =>
    post("start", { roomCode, playerId, token }),

  kick: (roomCode: string, playerId: string, token: string, targetId: string) =>
    post("kick", { roomCode, playerId, token, targetId }),

  leave: (roomCode: string, playerId: string, token: string) =>
    post("leave", { roomCode, playerId, token }),

  profile: (
    roomCode: string,
    playerId: string,
    token: string,
    data: { name?: string; avatar?: string | null },
  ) => post("profile", { roomCode, playerId, token, ...data }),

  nightAction: (roomCode: string, playerId: string, token: string, targetId: string) =>
    post("action", { roomCode, playerId, token, targetId }),

  question: (roomCode: string, playerId: string, token: string, text: string) =>
    post("question", { roomCode, playerId, token, text }),

  answer: (roomCode: string, playerId: string, token: string, text: string) =>
    post("answer", { roomCode, playerId, token, text }),

  accuse: (roomCode: string, playerId: string, token: string, text: string) =>
    post("accuse", { roomCode, playerId, token, text }),

  vote: (roomCode: string, playerId: string, token: string, targetId: string) =>
    post("vote", { roomCode, playerId, token, targetId }),

  playAgain: (roomCode: string, playerId: string, token: string) =>
    post("play-again", { roomCode, playerId, token }),
};
