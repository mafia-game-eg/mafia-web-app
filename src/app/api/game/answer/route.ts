import { requireRoom, submitAnswer } from "@/lib/mafia/actions";
import { errorResponse } from "@/lib/mafia/http";
import { buildView } from "@/lib/mafia/view";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const roomCode = String(body.roomCode ?? "");
    const playerId = String(body.playerId ?? "");
    const token = String(body.token ?? "");
    const text = String(body.text ?? "");
    const room = requireRoom(roomCode);
    submitAnswer(room, playerId, token, text);
    return Response.json({ ok: true, view: buildView(room, room.players[playerId]) });
  } catch (err) {
    return errorResponse(err);
  }
}
