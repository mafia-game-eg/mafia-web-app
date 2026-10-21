import { prisma } from "@/lib/prisma";

export async function generateUsername(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = `player${Math.floor(10000 + Math.random() * 90000)}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `player${Date.now()}`;
}