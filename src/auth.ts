import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/username";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;

      let username = (user as { username?: string | null }).username;
      if (!username) {
        username = await generateUsername();
        await prisma.user.update({ where: { id: user.id }, data: { username } });
      }
      session.user.username = username;

      return session;
    },
  },
});