import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { createResearchNoteAction } from "@/lib/actions/notes";
import { NoteForm } from "@/components/note-form";

export default async function NewNotePage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}/notes`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h2 className="text-lg font-medium">새 노트</h2>
      <NoteForm owner={owner} slug={slug} action={createResearchNoteAction} />
    </div>
  );
}
