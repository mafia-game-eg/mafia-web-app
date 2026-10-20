import { requireRoom, updateProfile } from "@/lib/mafia/actions";
import { errorResponse } from "@/lib/mafia/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const room = requireRoom(String(body.roomCode ?? ""));
    updateProfile(room, String(body.playerId ?? ""), String(body.token ?? ""), {
      name: typeof body.name === "string" ? body.name : undefined,
      avatar:
        body.avatar === null || typeof body.avatar === "string" ? body.avatar : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}