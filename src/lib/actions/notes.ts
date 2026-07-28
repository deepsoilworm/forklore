"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { researchNotes } from "@/db/schema";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getResearchNote } from "@/lib/note-queries";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(150),
  body: z.string().max(20000).optional(),
  order: z.coerce.number().int().optional(),
});

export async function createResearchNoteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = createSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    order: formData.get("order") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const [note] = await db
    .insert(researchNotes)
    .values({
      novelId: found.novel.id,
      authorId: session.user.id,
      title: parsed.title,
      body: parsed.body,
      order: parsed.order ?? 0,
    })
    .returning();

  redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${note.id}`);
}

const updateSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  noteId: z.string().uuid(),
  title: z.string().min(1).max(150),
  body: z.string().max(20000).optional(),
});

export async function updateResearchNoteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = updateSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    noteId: formData.get("noteId"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const existing = await getResearchNote(found.novel.id, parsed.noteId);
  if (!existing) throw new Error("노트를 찾을 수 없습니다");

  await db
    .update(researchNotes)
    .set({ title: parsed.title, body: parsed.body, updatedAt: new Date() })
    .where(and(eq(researchNotes.id, parsed.noteId), eq(researchNotes.novelId, found.novel.id)));

  redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
}

const deleteSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  noteId: z.string().uuid(),
});

export async function deleteResearchNoteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = deleteSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    noteId: formData.get("noteId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  await db
    .delete(researchNotes)
    .where(and(eq(researchNotes.id, parsed.noteId), eq(researchNotes.novelId, found.novel.id)));

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/notes`);
  redirect(`/n/${parsed.owner}/${parsed.slug}/notes`);
}
