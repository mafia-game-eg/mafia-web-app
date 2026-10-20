import { touchPlayer } from "@/lib/mafia/actions";
import { errorResponse } from "@/lib/mafia/http";
import { buildView } from "@/lib/mafia/view";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = url.searchParams.get("roomCode") ?? "";
    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const room = touchPlayer(roomCode, playerId, token);
    const player = room.players[playerId];
    return Response.json({ ok: true, view: buildView(room, player) });
  } catch (err) {
    return errorResponse(err);
  }
}
