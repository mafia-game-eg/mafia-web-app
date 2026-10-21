import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "لازم تسجّل دخول." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, avatar: true, email: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "لازم تسجّل دخول." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { username?: string; avatar?: string | null } = {};

  if (typeof body.username === "string") {
    const username = body.username.trim().toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "اليوزر نيم لازم يكون من 3 لـ 20 حرف إنجليزي صغير أو أرقام أو _ بس." },
        { status: 400 }
      );
    }

    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "اليوزر نيم ده مستخدم، جرّب غيره." }, { status: 409 });
    }

    data.username = username;
  }

  if (body.avatar === null) {
    data.avatar = null;
  } else if (typeof body.avatar === "string") {
    if (!body.avatar.startsWith("data:image/") || body.avatar.length > 300_000) {
      return NextResponse.json({ error: "الصورة مش مناسبة." }, { status: 400 });
    }
    data.avatar = body.avatar;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "مفيش حاجة تتحدّث." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true, ...data });
}