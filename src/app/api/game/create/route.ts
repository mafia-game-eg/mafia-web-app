import { createRoom } from "@/lib/mafia/actions";
import { errorResponse } from "@/lib/mafia/http";
import { buildView } from "@/lib/mafia/view";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { room, player } = createRoom({
      playerName: String(body.playerName ?? ""),
      avatar: typeof body.avatar === "string" ? body.avatar : null,
      maxPlayers: Number(body.maxPlayers ?? 8),
      revealRoleOnDeath: !!body.revealRoleOnDeath,
      questionPairs: Number(body.questionPairs ?? 3),
      revoteOnTie: body.revoteOnTie !== false,
      extraRoleType: body.extraRoleType === "sniper" ? "sniper" : "bodyguard",
    });
    return Response.json({
      ok: true,
      roomCode: room.code,
      playerId: player.id,
      token: player.token,
      view: buildView(room, player),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
