import { db } from "@/db";
import { researchNoteRevisions, researchNotes, users } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

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

export async function listResearchNoteRevisions(noteId: string) {
  return db
    .select({ revision: researchNoteRevisions, author: users })
    .from(researchNoteRevisions)
    .leftJoin(users, eq(researchNoteRevisions.authorId, users.id))
    .where(eq(researchNoteRevisions.noteId, noteId))
    .orderBy(desc(researchNoteRevisions.createdAt));
}

export async function getResearchNoteRevision(noteId: string, revisionId: string) {
  const [row] = await db
    .select()
    .from(researchNoteRevisions)
    .where(and(eq(researchNoteRevisions.id, revisionId), eq(researchNoteRevisions.noteId, noteId)))
    .limit(1);
  return row ?? null;
}
