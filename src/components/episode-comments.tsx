import Link from "next/link";
import { auth } from "@/auth";
import { listEpisodeComments } from "@/lib/queries";
import { addCommentAction } from "@/lib/actions/engagement";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export async function EpisodeComments({
  owner,
  slug,
  novelId,
  episodePath,
}: {
  owner: string;
  slug: string;
  novelId: string;
  episodePath: string;
}) {
  const [session, comments] = await Promise.all([
    auth(),
    listEpisodeComments(novelId, episodePath),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        댓글 {comments.length > 0 && comments.length}
      </h2>

      {comments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {comments.map(({ comment, author }) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={author.image ?? undefined} />
                <AvatarFallback>{author.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{author.username}</span>
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
        <form action={addCommentAction} className="flex flex-col gap-2">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="episodePath" value={episodePath} />
          <Textarea
            name="body"
            placeholder="이 화에 대한 감상을 남겨보세요"
            required
            maxLength={1000}
            rows={3}
          />
          <Button type="submit" size="sm" className="self-end">
            댓글 남기기
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/api/auth/signin" className="underline">
            로그인
          </Link>
          하면 댓글을 남길 수 있어요.
        </p>
      )}
    </div>
  );
}
