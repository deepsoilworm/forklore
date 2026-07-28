import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getResearchNote } from "@/lib/note-queries";
import { updateResearchNoteAction, deleteResearchNoteAction } from "@/lib/actions/notes";
import { NoteForm } from "@/components/note-form";
import { Button } from "@/components/ui/button";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; id: string }>;
}) {
  const { owner, slug, id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}/notes/${id}`);
  }

  const note = await getResearchNote(found.novel.id, id);
  if (!note) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h2 className="text-lg font-medium">노트 편집</h2>
      <NoteForm
        owner={owner}
        slug={slug}
        noteId={note.id}
        action={updateResearchNoteAction}
        initialTitle={note.title}
        initialBody={note.body ?? ""}
      />

      <form action={deleteResearchNoteAction} className="border-t pt-4">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="noteId" value={note.id} />
        <Button type="submit" variant="outline" size="sm">
          노트 삭제
        </Button>
      </form>
    </div>
  );
}
