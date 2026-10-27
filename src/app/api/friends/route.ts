import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkUsername } from "@/lib/username-rules";

// نظام الأصدقاء (زي الشطرنج):
//   POST   { username }  → طلب صداقة (لو الطرف التاني كان بعتلك قبلك → بيتوافق أوتوماتيك)
//   PATCH  { id }        → قبول طلب وصلك
//   DELETE ?id=          → حذف صديق / رفض طلب / إلغاء طلب بعتّه
//   GET                  → { friends, incoming, outgoing }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

const SELECT_USER = { id: true, username: true, avatar: true } as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);
  const uid = session.user.id;

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: uid }, { addresseeId: uid }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      requesterId: true,
      addresseeId: true,
      createdAt: true,
      requester: { select: SELECT_USER },
      addressee: { select: SELECT_USER },
    },
  });

  const friends = rows
    .filter((r) => r.status === "ACCEPTED")
    .map((r) => {
      const u = r.requesterId === uid ? r.addressee : r.requester;
      return { friendshipId: r.id, id: u.id, username: u.username, avatar: u.avatar, since: r.createdAt };
    });

  const incoming = rows
    .filter((r) => r.status === "PENDING" && r.addresseeId === uid)
    .map((r) => ({ id: r.id, user: r.requester, createdAt: r.createdAt }));

  const outgoing = rows
    .filter((r) => r.status === "PENDING" && r.requesterId === uid)
    .map((r) => ({ id: r.id, user: r.addressee, createdAt: r.createdAt }));

  return NextResponse.json(
    { friends, incoming, outgoing },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);
  const uid = session.user.id;

  const raw = await req.json().catch(() => null);
  const username = (raw as { username?: unknown } | null)?.username;
  if (typeof username !== "string" || !username.trim()) {
    return fail("اكتب اسم صاحبك اللي عايز تضيفه.", 400);
  }

  // نفس قواعد وتطبيع اليوزر نيم بتاع صفحة البروفايل، وبنفصل الشرط
  // عشان الـ TypeScript يعرف يضيّق نوع الـ union ويشوف خاصية error
  const check = checkUsername(username.trim(), undefined);
  if (!check.ok) return fail(check.error, 400);

  const target = await prisma.user.findFirst({
    where: { username: check.username },
    select: SELECT_USER,
  });
  if (!target) {
    return fail(`مفيش حد اسمه "${check.username}". اتأكد من الكتابة وجرّب تاني.`, 404);
  }
  if (target.id === uid) return fail("مش هتقدر تضيف نفسك طبعًا.", 400);

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: uid, addresseeId: target.id },
        { requesterId: target.id, addresseeId: uid },
      ],
    },
    select: { id: true, status: true, requesterId: true },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") return fail("إنتو أصحاب خلاص.", 409);
    if (existing.requesterId === uid) {
      return fail("بعتّله طلب قبل كده. استنى يوافق.", 409);
    }
    // هو هو اللي بعتلك طلب قبل كده — بتبقى أصحاب على طول من غير خطوتين
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
    });
    return NextResponse.json({ ok: true, accepted: true, username: target.username });
  }

  await prisma.friendship.create({
    data: { requesterId: uid, addresseeId: target.id, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, sent: true, username: target.username });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);
  const uid = session.user.id;

  const raw = await req.json().catch(() => null);
  const id = (raw as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !id) return fail("الطلب مش صحيح.", 400);

  const row = await prisma.friendship.findUnique({
    where: { id },
    select: { id: true, status: true, requesterId: true, addresseeId: true },
  });
  if (!row) return fail("الطلب مش موجود.", 404);
  if (row.addresseeId !== uid) return fail("الطلب ده مش ليك.", 403);
  if (row.status !== "PENDING") return fail("الطلب ده متأكد خلاص.", 409);

  await prisma.friendship.update({ where: { id }, data: { status: "ACCEPTED" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("لازم تسجّل دخول.", 401);
  const uid = session.user.id;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("الطلب مش صحيح.", 400);

  const row = await prisma.friendship.findUnique({
    where: { id },
    select: { requesterId: true, addresseeId: true },
  });
  if (!row) return fail("مش موجود.", 404);
  if (row.requesterId !== uid && row.addresseeId !== uid) return fail("مش مسموح.", 403);

  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}