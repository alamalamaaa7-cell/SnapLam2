import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "lamzy103@gmail.com").toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Expose role so the client + admin gate can read it.
        (session.user as any).role = (user as any).role ?? "USER";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.email) return;
      const email = user.email.toLowerCase();
      const wantRole = email === ADMIN_EMAIL ? "ADMIN" : undefined;
      try {
        await prisma.user.update({
          where: { email: user.email },
          data: {
            lastSeenAt: new Date(),
            ...(wantRole ? { role: wantRole } : {}),
          },
        });
      } catch {
        /* user may not exist yet on very first insert — adapter handles create */
      }
    },
  },
});

export function isAdminEmail(email?: string | null) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
