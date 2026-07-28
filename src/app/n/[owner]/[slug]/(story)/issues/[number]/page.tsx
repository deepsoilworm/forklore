import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getIssue, listIssueComments } from "@/lib/issue-queries";
import { addIssueCommentAction, setIssueStatusAction } from "@/lib/actions/issues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";

const statusLabel: Record<string, string> = { open: "열림", closed: "닫힘" };

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; number: string }>;
}) {
  const { owner, slug, number } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const found2 = await getIssue(found.novel.id, Number(number));
  if (!found2) notFound();
  const { issue, author } = found2;

  const [session, comments] = await Promise.all([auth(), listIssueComments(issue.id)]);
  const canToggle = session?.user?.id
    ? issue.authorId === session.user.id || (await canWrite(found.novel, session.user.id))
    : false;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium">
          {issue.title} <span className="text-muted-foreground">#{issue.number}</span>
        </h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={issue.status === "open" ? "default" : "outline"}>
            {statusLabel[issue.status]}
          </Badge>
          <span>
            {author.username}님이 {formatDistanceToNow(issue.createdAt, { addSuffix: true })} 작성
          </span>
        </div>
      </div>

      {issue.body && (
        <div className="flex gap-3">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={author.image ?? undefined} />
            <AvatarFallback>{author.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="whitespace-pre-wrap rounded-lg border px-3 py-2.5 text-sm leading-7">
            {issue.body}
          </p>
        </div>
      )}

      {comments.length > 0 && (
        <ul className="flex flex-col gap-4 border-t pt-4">
          {comments.map(({ comment, author: commentAuthor }) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={commentAuthor.image ?? undefined} />
                <AvatarFallback>{commentAuthor.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{commentAuthor.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {session?.user ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          {canToggle && (
            <form action={setIssueStatusAction} className="self-start">
              <input type="hidden" name="owner" value={owner} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="number" value={issue.number} />
              <input
                type="hidden"
                name="status"
                value={issue.status === "open" ? "closed" : "open"}
              />
              <Button type="submit" variant="outline" size="sm">
                {issue.status === "open" ? "이슈 닫기" : "다시 열기"}
              </Button>
            </form>
          )}
          <form action={addIssueCommentAction} className="flex flex-col gap-2">
            <input type="hidden" name="owner" value={owner} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="number" value={issue.number} />
            <Textarea name="body" placeholder="댓글을 남겨보세요" required rows={3} />
            <Button type="submit" size="sm" className="self-end">
              댓글 남기기
            </Button>
          </form>
        </div>
      ) : (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          댓글을 남기려면 로그인하세요.
        </p>
      )}
    </div>
  );
}
