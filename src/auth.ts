import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

async function uniqueUsernameFrom(seed: string) {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "writer";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`;
    const existing = await db.query.users.findFirst({
      where: eq(users.username, candidate),
    });
    if (!existing) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "database" },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const seed = user.email?.split("@")[0] ?? user.name ?? "writer";
      const username = await uniqueUsernameFrom(seed);
      await db.update(users).set({ username }).where(eq(users.id, user.id));
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.username =
          (user as typeof user & { username?: string }).username ?? null;
      }
      return session;
    },
  },
});
