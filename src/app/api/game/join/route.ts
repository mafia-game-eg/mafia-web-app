import { joinRoom } from "@/lib/mafia/actions";
import { errorResponse } from "@/lib/mafia/http";
import { buildView } from "@/lib/mafia/view";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { room, player, reconnected } = joinRoom({
      roomCode: String(body.roomCode ?? ""),
      playerName: String(body.playerName ?? ""),
      avatar: typeof body.avatar === "string" ? body.avatar : null,
      token: body.token ? String(body.token) : undefined,
      playerId: body.playerId ? String(body.playerId) : undefined,
    });
    return Response.json({
      ok: true,
      roomCode: room.code,
      playerId: player.id,
      token: player.token,
      reconnected,
      view: buildView(room, player),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
