import { db } from "@/db";
import {
  collaborators,
  episodeComments,
  novels,
  pollOptions,
  polls,
  pollVotes,
  pullRequests,
  stars,
  users,
} from "@/db/schema";
import { and, asc, desc, eq, ne, or } from "drizzle-orm";

export async function getNovelByOwnerSlug(owner: string, slug: string) {
  const rows = await db
    .select({ novel: novels, owner: users })
    .from(novels)
    .innerJoin(users, eq(novels.ownerId, users.id))
    .where(and(eq(users.username, owner), eq(novels.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublicNovels(opts?: {
  limit?: number;
  category?: (typeof novels.$inferSelect)["category"];
  language?: (typeof novels.$inferSelect)["language"];
}) {
  return db
    .select({ novel: novels, owner: users })
    .from(novels)
    .innerJoin(users, eq(novels.ownerId, users.id))
    .where(
      and(
        eq(novels.visibility, "public"),
        opts?.category ? eq(novels.category, opts.category) : undefined,
        opts?.language ? eq(novels.language, opts.language) : undefined,
      ),
    )
    .orderBy(desc(novels.updatedAt))
    .limit(opts?.limit ?? 20);
}

export async function isStarredByUser(novelId: string, userId: string | null) {
  if (!userId) return false;
  const [row] = await db
    .select()
    .from(stars)
    .where(and(eq(stars.novelId, novelId), eq(stars.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function listOtherNovelsByOwner(ownerId: string, excludeNovelId: string, limit = 6) {
  return db
    .select({ novel: novels })
    .from(novels)
    .where(
      and(
        eq(novels.ownerId, ownerId),
        eq(novels.visibility, "public"),
        ne(novels.id, excludeNovelId),
      ),
    )
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

export async function listCollaborators(novelId: string) {
  return db
    .select({ collaborator: collaborators, user: users })
    .from(collaborators)
    .innerJoin(users, eq(collaborators.userId, users.id))
    .where(eq(collaborators.novelId, novelId))
    .orderBy(asc(users.username));
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

export async function canRead(novel: typeof novels.$inferSelect, userId: string | null) {
  if (novel.visibility === "public") return true;
  if (!userId) return false;
  if (novel.ownerId === userId) return true;
  return (await getCollaboratorRole(novel.id, userId)) !== null;
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

export async function listEpisodeComments(novelId: string, episodePath: string) {
  return db
    .select({ comment: episodeComments, author: users })
    .from(episodeComments)
    .innerJoin(users, eq(episodeComments.authorId, users.id))
    .where(
      and(eq(episodeComments.novelId, novelId), eq(episodeComments.episodePath, episodePath)),
    )
    .orderBy(asc(episodeComments.createdAt));
}

export type PollWithResults = {
  poll: typeof polls.$inferSelect;
  options: { option: typeof pollOptions.$inferSelect; votes: number }[];
  totalVotes: number;
  myOptionId: string | null;
};

export async function getEpisodePoll(
  novelId: string,
  episodePath: string,
  userId: string | null,
): Promise<PollWithResults | null> {
  const [poll] = await db
    .select()
    .from(polls)
    .where(and(eq(polls.novelId, novelId), eq(polls.episodePath, episodePath)))
    .limit(1);
  if (!poll) return null;

  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, poll.id))
    .orderBy(asc(pollOptions.order));

  const votes = await db.select().from(pollVotes).where(eq(pollVotes.pollId, poll.id));
  const voteCounts = new Map<string, number>();
  for (const v of votes) voteCounts.set(v.optionId, (voteCounts.get(v.optionId) ?? 0) + 1);

  const myVote = userId ? votes.find((v) => v.userId === userId) : undefined;

  return {
    poll,
    options: options.map((option) => ({
      option,
      votes: voteCounts.get(option.id) ?? 0,
    })),
    totalVotes: votes.length,
    myOptionId: myVote?.optionId ?? null,
  };
}
