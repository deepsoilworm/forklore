"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { issueComments, issues } from "@/db/schema";
import { canRead, canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getIssue } from "@/lib/issue-queries";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(150),
  body: z.string().max(5000).optional(),
});

export async function createIssueAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = createSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canRead(found.novel, session.user.id))) {
    throw new Error("이야기를 볼 수 있는 권한이 없습니다");
  }

  const number = await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${issues.number}), 0)` })
      .from(issues)
      .where(eq(issues.novelId, found.novel.id));
    const next = Number(max) + 1;
    await tx.insert(issues).values({
      novelId: found.novel.id,
      number: next,
      title: parsed.title,
      body: parsed.body,
      authorId: session.user.id,
    });
    return next;
  });

  redirect(`/n/${parsed.owner}/${parsed.slug}/issues/${number}`);
}

const commentSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  number: z.coerce.number().int(),
  body: z.string().min(1).max(5000),
});

export async function addIssueCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = commentSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    number: formData.get("number"),
    body: formData.get("body"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canRead(found.novel, session.user.id))) {
    throw new Error("이야기를 볼 수 있는 권한이 없습니다");
  }

  const found2 = await getIssue(found.novel.id, parsed.number);
  if (!found2) throw new Error("이슈를 찾을 수 없습니다");

  await db.insert(issueComments).values({
    issueId: found2.issue.id,
    authorId: session.user.id,
    body: parsed.body,
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/issues/${parsed.number}`);
}

const statusSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  number: z.coerce.number().int(),
  status: z.enum(["open", "closed"]),
});

export async function setIssueStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = statusSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    number: formData.get("number"),
    status: formData.get("status"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");

  const found2 = await getIssue(found.novel.id, parsed.number);
  if (!found2) throw new Error("이슈를 찾을 수 없습니다");

  const allowed =
    found2.issue.authorId === session.user.id || (await canWrite(found.novel, session.user.id));
  if (!allowed) throw new Error("권한이 없습니다");

  await db
    .update(issues)
    .set({
      status: parsed.status,
      closedAt: parsed.status === "closed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(issues.novelId, found.novel.id), eq(issues.number, parsed.number)));

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/issues/${parsed.number}`);
}
