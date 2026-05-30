import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { env, hasGoogle } from "@/lib/env";

// Build the provider list. Google is only added when its keys are configured, so the app
// runs with just email/password (or fully anonymous) when Google isn't set up.
const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: { email: {}, password: {} },
    authorize: async (creds) => {
      const email = String(creds?.email ?? "").toLowerCase().trim();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.password) return null;
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (hasGoogle()) {
  providers.push(Google({ clientId: env.googleId, clientSecret: env.googleSecret }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  // Credentials requires JWT sessions (no DB session row), which also suits OAuth here.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: env.authSecret,
  // Railway terminates TLS at a proxy; trust the forwarded host for callback URLs.
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
