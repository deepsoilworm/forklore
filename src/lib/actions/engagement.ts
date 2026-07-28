"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { episodeComments, novels, pollOptions, polls, pollVotes, stars } from "@/db/schema";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const commentSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  episodePath: z.string().min(1),
  body: z.string().min(1).max(1000),
});

export async function addCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = commentSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    episodePath: formData.get("episodePath"),
    body: formData.get("body"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");

  await db.insert(episodeComments).values({
    novelId: found.novel.id,
    episodePath: parsed.episodePath,
    authorId: session.user.id,
    body: parsed.body,
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/read/[file]`, "page");
}

const createPollSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  episodePath: z.string().min(1),
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(80)).min(2).max(4),
});

export async function createPollAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const options = formData
    .getAll("options")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const parsed = createPollSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    episodePath: formData.get("episodePath"),
    question: formData.get("question"),
    options,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("투표를 만들 권한이 없습니다");
  }

  await db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({
        novelId: found.novel.id,
        episodePath: parsed.episodePath,
        question: parsed.question,
        authorId: session.user.id,
      })
      .returning();

    await tx.insert(pollOptions).values(
      parsed.options.map((label, i) => ({
        pollId: poll.id,
        label,
        order: i,
      })),
    );
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/read/[file]`, "page");
}

const voteSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  pollId: z.string().uuid(),
  optionId: z.string().uuid(),
});

export async function votePollAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = voteSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    pollId: formData.get("pollId"),
    optionId: formData.get("optionId"),
  });

  const option = await db.query.pollOptions.findFirst({
    where: and(eq(pollOptions.id, parsed.optionId), eq(pollOptions.pollId, parsed.pollId)),
  });
  if (!option) throw new Error("잘못된 투표 옵션입니다");

  await db
    .insert(pollVotes)
    .values({
      pollId: parsed.pollId,
      optionId: parsed.optionId,
      userId: session.user.id,
    })
    .onConflictDoUpdate({
      target: [pollVotes.pollId, pollVotes.userId],
      set: { optionId: parsed.optionId, createdAt: new Date() },
    });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/read/[file]`, "page");
}

const starSchema = z.object({
  owner: z.string(),
  slug: z.string(),
});

export async function toggleStarAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = starSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(stars)
      .where(and(eq(stars.novelId, found.novel.id), eq(stars.userId, session.user.id)))
      .limit(1);

    if (existing) {
      await tx
        .delete(stars)
        .where(and(eq(stars.novelId, found.novel.id), eq(stars.userId, session.user.id)));
      await tx
        .update(novels)
        .set({ starCount: sql`greatest(${novels.starCount} - 1, 0)` })
        .where(eq(novels.id, found.novel.id));
    } else {
      await tx.insert(stars).values({ novelId: found.novel.id, userId: session.user.id });
      await tx
        .update(novels)
        .set({ starCount: sql`${novels.starCount} + 1` })
        .where(eq(novels.id, found.novel.id));
    }
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/read`);
}
