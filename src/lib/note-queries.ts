import { db } from "@/db";
import { researchNotes } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function listResearchNotes(novelId: string) {
  return db
    .select()
    .from(researchNotes)
    .where(eq(researchNotes.novelId, novelId))
    .orderBy(asc(researchNotes.order), asc(researchNotes.createdAt));
}

export async function getResearchNote(novelId: string, noteId: string) {
  const [row] = await db
    .select()
    .from(researchNotes)
    .where(and(eq(researchNotes.id, noteId), eq(researchNotes.novelId, novelId)))
    .limit(1);
  return row ?? null;
}
