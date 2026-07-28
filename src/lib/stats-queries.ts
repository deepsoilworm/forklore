import { db } from "@/db";
import { commits } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export type DailyWritingStat = { day: string; chars: number };

// Only commits made through the editor carry charDelta (see novel-repo.ts
// commitChapter) — history synced from git log for older commits has no
// per-user char data, so stats only reflect activity since this shipped.
export async function getDailyWritingStats(
  userId: string,
  days = 90,
): Promise<DailyWritingStat[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${commits.createdAt}), 'YYYY-MM-DD')`,
      chars: sql<number>`coalesce(sum(greatest(${commits.charDelta}, 0)), 0)`,
    })
    .from(commits)
    .where(
      and(
        eq(commits.authorId, userId),
        gte(commits.createdAt, sql`now() - (${days} || ' days')::interval`),
      ),
    )
    .groupBy(sql`date_trunc('day', ${commits.createdAt})`)
    .orderBy(sql`date_trunc('day', ${commits.createdAt})`);

  return rows.map((r) => ({ day: r.day, chars: Number(r.chars) }));
}
