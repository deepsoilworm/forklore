import { db } from "@/db";
import { collaborators, novels, pullRequests, users } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";

export async function getNovelByOwnerSlug(owner: string, slug: string) {
  const rows = await db
    .select({ novel: novels, owner: users })
    .from(novels)
    .innerJoin(users, eq(novels.ownerId, users.id))
    .where(and(eq(users.username, owner), eq(novels.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublicNovels(limit = 20) {
  return db
    .select({ novel: novels, owner: users })
    .from(novels)
    .innerJoin(users, eq(novels.ownerId, users.id))
    .where(eq(novels.visibility, "public"))
    .orderBy(desc(novels.updatedAt))
    .limit(limit);
}

export async function listNovelsForUser(userId: string) {
  return db
    .select({ novel: novels, owner: users })
    .from(novels)
    .innerJoin(users, eq(novels.ownerId, users.id))
    .leftJoin(
      collaborators,
      and(eq(collaborators.novelId, novels.id), eq(collaborators.userId, userId)),
    )
    .where(or(eq(novels.ownerId, userId), eq(collaborators.userId, userId)))
    .orderBy(desc(novels.updatedAt));
}

export async function getCollaboratorRole(novelId: string, userId: string) {
  const [row] = await db
    .select()
    .from(collaborators)
    .where(and(eq(collaborators.novelId, novelId), eq(collaborators.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function canWrite(novel: typeof novels.$inferSelect, userId: string | null) {
  if (!userId) return false;
  if (novel.ownerId === userId) return true;
  const role = await getCollaboratorRole(novel.id, userId);
  return role === "owner" || role === "maintainer" || role === "writer";
}

export async function listPullRequests(novelId: string) {
  return db
    .select({ pr: pullRequests, author: users })
    .from(pullRequests)
    .innerJoin(users, eq(pullRequests.authorId, users.id))
    .where(eq(pullRequests.novelId, novelId))
    .orderBy(desc(pullRequests.createdAt));
}

export async function getPullRequest(novelId: string, number: number) {
  const [row] = await db
    .select({ pr: pullRequests, author: users })
    .from(pullRequests)
    .innerJoin(users, eq(pullRequests.authorId, users.id))
    .where(and(eq(pullRequests.novelId, novelId), eq(pullRequests.number, number)))
    .limit(1);
  return row ?? null;
}
