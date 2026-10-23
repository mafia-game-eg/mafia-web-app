import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkUsername } from "@/lib/username-rules";
// الصورة بتتحفظ كـ data URL: نسمح بصيغ الصور العادية بس (من غير SVG) وبحجم صغير،
// لأنها هتتبعت مع قايمة الأصدقاء وتتكرر كتير.
const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_CHARS = 120_000;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, avatar: true, email: true },
  });
  if (!user) return fail("الحساب مش موجود.", 404);

  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);
  const userId = session.user.id;

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return fail("الطلب مش صحيح.", 400);
  const body = raw as { username?: unknown; avatar?: unknown };

  const data: { username?: string; avatar?: string | null } = {};

  // اليوزر نيم
  if (body.username !== undefined) {
    if (typeof body.username !== "string") return fail("اليوزر نيم مش صحيح.", 400);

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const check = checkUsername(body.username, me?.username);
    if (!check.ok) return fail(check.error, 400);

    const taken = await prisma.user.findFirst({
      where: { username: check.username, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) return fail("اليوزر نيم ده مستخدم، جرّب غيره.", 409);

    data.username = check.username;
  }

  // الصورة
  if (body.avatar !== undefined) {
    if (body.avatar === null) {
      data.avatar = null;
    } else if (
      typeof body.avatar === "string" &&
      body.avatar.length <= AVATAR_MAX_CHARS &&
      AVATAR_RE.test(body.avatar)
    ) {
      data.avatar = body.avatar;
    } else {
      return fail("الصورة مش مناسبة (PNG أو JPEG أو WebP وحجم صغير).", 400);
    }
  }

  if (Object.keys(data).length === 0) return fail("مفيش حاجة تتحدّث.", 400);

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { username: true },
    });
    return NextResponse.json({ ok: true, username: updated.username });
  } catch (e) {
    // اتنين ضغطوا على نفس اليوزر نيم في نفس اللحظة (الـ unique في الداتا بيز هو الحكم)
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return fail("اليوزر نيم ده مستخدم، جرّب غيره.", 409);
    }
    console.error("[profile PATCH]", e);
    return fail("حصلت مشكلة، جرّب تاني.", 500);
  }
}