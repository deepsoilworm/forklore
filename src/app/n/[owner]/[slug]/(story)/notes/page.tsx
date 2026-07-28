import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listResearchNotes } from "@/lib/note-queries";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const session = await auth();
  const [writable, notes] = await Promise.all([
    session?.user?.id ? canWrite(found.novel, session.user.id) : false,
    listResearchNotes(found.novel.id),
  ]);

  const base = `/n/${owner}/${slug}/notes`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex justify-end">
        {writable && (
          <Button size="sm" nativeButton={false} render={<Link href={`${base}/new`} />}>
            새 노트
          </Button>
        )}
      </div>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          아직 노트가 없어요. 설정, 자료, 메모를 자유롭게 정리해보세요.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`${base}/${note.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-accent/50"
              >
                <p className="text-sm font-medium">{note.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(note.updatedAt, { addSuffix: true })} 수정됨
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
