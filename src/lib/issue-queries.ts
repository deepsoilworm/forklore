import { db } from "@/db";
import { issueComments, issues, users } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export async function listIssues(novelId: string, status?: "open" | "closed") {
  return db
    .select({ issue: issues, author: users })
    .from(issues)
    .innerJoin(users, eq(issues.authorId, users.id))
    .where(and(eq(issues.novelId, novelId), status ? eq(issues.status, status) : undefined))
    .orderBy(desc(issues.createdAt));
}

export async function getIssue(novelId: string, number: number) {
  const [row] = await db
    .select({ issue: issues, author: users })
    .from(issues)
    .innerJoin(users, eq(issues.authorId, users.id))
    .where(and(eq(issues.novelId, novelId), eq(issues.number, number)))
    .limit(1);
  return row ?? null;
}

export async function listIssueComments(issueId: string) {
  return db
    .select({ comment: issueComments, author: users })
    .from(issueComments)
    .innerJoin(users, eq(issueComments.authorId, users.id))
    .where(eq(issueComments.issueId, issueId))
    .orderBy(asc(issueComments.createdAt));
}
