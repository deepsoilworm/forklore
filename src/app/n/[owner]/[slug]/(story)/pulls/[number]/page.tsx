import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug, getPullRequest } from "@/lib/queries";
import { diffBranches } from "@/lib/git/diff";
import { Badge } from "@/components/ui/badge";
import { MergePrButton } from "@/components/merge-pr-button";
import { closePullRequestAction } from "@/lib/actions/pulls";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  open: "열림",
  merged: "병합됨",
  closed: "닫힘",
};

export default async function PullRequestPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; number: string }>;
}) {
  const { owner, slug, number } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const found2 = await getPullRequest(found.novel.id, Number(number));
  if (!found2) notFound();
  const { pr, author } = found2;

  const [session, diffs] = await Promise.all([
    auth(),
    diffBranches({
      novelId: found.novel.id,
      source: pr.sourceBranch,
      target: pr.targetBranch,
    }),
  ]);

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">
            #{pr.number} {pr.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {author.username} · {pr.sourceBranch} → {pr.targetBranch}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              pr.status === "open" ? "default" : pr.status === "merged" ? "secondary" : "outline"
            }
          >
            {statusLabel[pr.status]}
          </Badge>
          {writable && pr.status === "open" && (
            <>
              <MergePrButton owner={owner} slug={slug} number={pr.number} />
              <form action={closePullRequestAction}>
                <input type="hidden" name="owner" value={owner} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="number" value={pr.number} />
                <Button type="submit" variant="outline">
                  닫기
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {pr.description && (
        <p className="whitespace-pre-wrap rounded-md border p-4 text-sm">
          {pr.description}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {diffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">변경된 내용이 없어요.</p>
        ) : (
          diffs.map((file) => (
            <div key={file.path} className="overflow-hidden rounded-md border">
              <div className="border-b bg-muted/40 px-4 py-2 font-mono text-xs">
                {file.path}
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                {file.changes.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.added
                        ? "block bg-green-500/15 text-green-700 dark:text-green-400"
                        : part.removed
                          ? "block bg-red-500/15 text-red-700 dark:text-red-400"
                          : "block"
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
