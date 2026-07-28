"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { noteChangeRequests, researchNoteRevisions, researchNotes } from "@/db/schema";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getNoteChangeRequest, getResearchNote, getResearchNoteRevision } from "@/lib/note-queries";
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

  // Same branch → PR → merge mirroring as characters: the owner edits
  // directly, anyone else's edit becomes a pending request instead.
  if (session.user.id !== found.novel.ownerId) {
    await db.insert(noteChangeRequests).values({
      noteId: parsed.noteId,
      authorId: session.user.id,
      title: parsed.title,
      body: parsed.body,
    });
    redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
  }

  await db.transaction(async (tx) => {
    // Multiple collaborators can edit the same note — snapshot what it
    // looked like right before this edit overwrites it.
    await tx.insert(researchNoteRevisions).values({
      noteId: parsed.noteId,
      title: existing.title,
      body: existing.body,
      authorId: session.user!.id,
    });

    await tx
      .update(researchNotes)
      .set({ title: parsed.title, body: parsed.body, updatedAt: new Date() })
      .where(and(eq(researchNotes.id, parsed.noteId), eq(researchNotes.novelId, found.novel.id)));
  });

  redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
}

const restoreSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  noteId: z.string().uuid(),
  revisionId: z.string().uuid(),
});

export async function restoreResearchNoteRevisionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = restoreSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    noteId: formData.get("noteId"),
    revisionId: formData.get("revisionId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const [current, revision] = await Promise.all([
    getResearchNote(found.novel.id, parsed.noteId),
    getResearchNoteRevision(parsed.noteId, parsed.revisionId),
  ]);
  if (!current || !revision) throw new Error("찾을 수 없습니다");

  await db.transaction(async (tx) => {
    await tx.insert(researchNoteRevisions).values({
      noteId: current.id,
      title: current.title,
      body: current.body,
      authorId: session.user!.id,
    });
    await tx
      .update(researchNotes)
      .set({ title: revision.title, body: revision.body, updatedAt: new Date() })
      .where(eq(researchNotes.id, current.id));
  });

  redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
}

const resolveRequestSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  noteId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export async function approveNoteChangeRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = resolveRequestSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    noteId: formData.get("noteId"),
    requestId: formData.get("requestId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (session.user.id !== found.novel.ownerId) {
    throw new Error("소유자만 변경 요청을 승인할 수 있어요");
  }

  const [current, request] = await Promise.all([
    getResearchNote(found.novel.id, parsed.noteId),
    getNoteChangeRequest(parsed.noteId, parsed.requestId),
  ]);
  if (!current || !request || request.status !== "pending") throw new Error("찾을 수 없습니다");

  await db.transaction(async (tx) => {
    await tx.insert(researchNoteRevisions).values({
      noteId: current.id,
      title: current.title,
      body: current.body,
      authorId: session.user!.id,
    });
    await tx
      .update(researchNotes)
      .set({ title: request.title, body: request.body, updatedAt: new Date() })
      .where(eq(researchNotes.id, current.id));
    await tx
      .update(noteChangeRequests)
      .set({ status: "approved", resolvedAt: new Date(), resolvedById: session.user!.id })
      .where(eq(noteChangeRequests.id, request.id));
  });

  redirect(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
}

export async function rejectNoteChangeRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = resolveRequestSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    noteId: formData.get("noteId"),
    requestId: formData.get("requestId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (session.user.id !== found.novel.ownerId) {
    throw new Error("소유자만 변경 요청을 거절할 수 있어요");
  }

  await db
    .update(noteChangeRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedById: session.user.id })
    .where(and(eq(noteChangeRequests.id, parsed.requestId), eq(noteChangeRequests.noteId, parsed.noteId)));

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/notes/${parsed.noteId}`);
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
