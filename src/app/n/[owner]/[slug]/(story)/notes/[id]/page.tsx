import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getResearchNote } from "@/lib/note-queries";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; id: string }>;
}) {
  const { owner, slug, id } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const note = await getResearchNote(found.novel.id, id);
  if (!note) notFound();

  const session = await auth();
  const writable = session?.user?.id ? await canWrite(found.novel, session.user.id) : false;
  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`${base}/notes`} className="text-sm text-muted-foreground hover:text-foreground">
          ← 노트 목록으로
        </Link>
        {writable && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${base}/notes/${note.id}/edit`} />}
          >
            편집
          </Button>
        )}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{note.title}</h1>

      {note.body ? (
        <Markdown content={note.body} />
      ) : (
        <p className="text-sm text-muted-foreground">내용이 없어요.</p>
      )}
    </div>
  );
}
