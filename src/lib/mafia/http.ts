import { GameError } from "./actions";

export function errorResponse(err: unknown) {
  if (err instanceof GameError) {
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
  console.error(err);
  return Response.json(
    { ok: false, error: "حدث خطأ غير متوقع في السيرفر." },
    { status: 500 },
  );
}
