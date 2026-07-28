"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { pullRequests } from "@/db/schema";
import { canWrite, getNovelByOwnerSlug, getPullRequest } from "@/lib/queries";
import { mergeBranches } from "@/lib/git/novel-repo";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  sourceBranch: z.string().min(1),
  targetBranch: z.string().min(1),
});

export async function createPullRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = createSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    sourceBranch: formData.get("sourceBranch"),
    targetBranch: formData.get("targetBranch"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("소설을 찾을 수 없습니다");

  const number = await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${pullRequests.number}), 0)` })
      .from(pullRequests)
      .where(eq(pullRequests.novelId, found.novel.id));
    const next = Number(max) + 1;
    await tx.insert(pullRequests).values({
      novelId: found.novel.id,
      number: next,
      title: parsed.title,
      description: parsed.description,
      sourceBranch: parsed.sourceBranch,
      targetBranch: parsed.targetBranch,
      authorId: session.user.id,
    });
    return next;
  });

  redirect(`/n/${parsed.owner}/${parsed.slug}/pulls/${number}`);
}

export async function mergePullRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const owner = String(formData.get("owner"));
  const slug = String(formData.get("slug"));
  const number = Number(formData.get("number"));

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) throw new Error("소설을 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("병합 권한이 없습니다");
  }

  const existing = await getPullRequest(found.novel.id, number);
  if (!existing || existing.pr.status !== "open") {
    throw new Error("병합할 수 없는 PR입니다");
  }

  const result = await mergeBranches({
    novelId: found.novel.id,
    source: existing.pr.sourceBranch,
    target: existing.pr.targetBranch,
    author: {
      name: session.user.name ?? session.user.username ?? "anonymous",
      email: session.user.email ?? `${session.user.username}@users.forklore.dev`,
    },
    message: `Merge pull request #${number} from ${existing.pr.sourceBranch}`,
  });

  if (result.status === "conflict") {
    return { status: "conflict" as const, conflicts: result.conflicts };
  }

  await db
    .update(pullRequests)
    .set({
      status: "merged",
      mergedAt: new Date(),
      mergeCommitSha: "oid" in result ? result.oid : null,
      updatedAt: new Date(),
    })
    .where(and(eq(pullRequests.novelId, found.novel.id), eq(pullRequests.number, number)));

  revalidatePath(`/n/${owner}/${slug}/pulls/${number}`);
  return { status: "merged" as const };
}

export async function closePullRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const owner = String(formData.get("owner"));
  const slug = String(formData.get("slug"));
  const number = Number(formData.get("number"));

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) throw new Error("소설을 찾을 수 없습니다");

  await db
    .update(pullRequests)
    .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(pullRequests.novelId, found.novel.id), eq(pullRequests.number, number)));

  redirect(`/n/${owner}/${slug}/pulls/${number}`);
}
