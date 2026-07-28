import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import {
  getResearchNote,
  listPendingNoteChangeRequests,
  listResearchNoteRevisions,
} from "@/lib/note-queries";
import {
  approveNoteChangeRequestAction,
  rejectNoteChangeRequestAction,
  restoreResearchNoteRevisionAction,
} from "@/lib/actions/notes";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { formatDistanceToNow } from "date-fns";

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

  const [session, revisions, pendingRequests] = await Promise.all([
    auth(),
    listResearchNoteRevisions(note.id),
    listPendingNoteChangeRequests(note.id),
  ]);
  const writable = session?.user?.id ? await canWrite(found.novel, session.user.id) : false;
  const isOwner = session?.user?.id === found.novel.ownerId;
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

      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-6">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            변경 요청 대기 중 ({pendingRequests.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingRequests.map(({ request, author }) => (
              <li key={request.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {author.username} · {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                  </span>
                  {isOwner && (
                    <div className="flex gap-2">
                      <form action={rejectNoteChangeRequestAction}>
                        <input type="hidden" name="owner" value={owner} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button type="submit" variant="outline" size="sm">
                          거절
                        </Button>
                      </form>
                      <form action={approveNoteChangeRequestAction}>
                        <input type="hidden" name="owner" value={owner} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button type="submit" size="sm">
                          승인
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
                <p className="font-medium">{request.title}</p>
                {request.body && <p className="whitespace-pre-wrap text-muted-foreground">{request.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revisions.length > 0 && (
        <details className="border-t pt-6">
          <summary className="cursor-pointer px-1 text-sm font-medium text-muted-foreground">
            버전 기록 ({revisions.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {revisions.map(({ revision, author }) => (
              <li
                key={revision.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {author?.username ?? "알 수 없음"} ·{" "}
                  {formatDistanceToNow(revision.createdAt, { addSuffix: true })} · {revision.title}
                </span>
                {writable && (
                  <form action={restoreResearchNoteRevisionAction}>
                    <input type="hidden" name="owner" value={owner} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <Button type="submit" variant="outline" size="sm">
                      이 버전으로 복원
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
