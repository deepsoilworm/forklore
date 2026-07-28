import { notFound } from "next/navigation";
import Link from "next/link";
import { getNovelByOwnerSlug, listPullRequests } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const statusLabel: Record<string, string> = {
  open: "열림",
  merged: "병합됨",
  closed: "닫힘",
};

export default async function PullsPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const prs = await listPullRequests(found.novel.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/n/${owner}/${slug}/pulls/new`} />}
        >
          새 풀 리퀘스트
        </Button>
      </div>
      {prs.length === 0 ? (
        <p className="text-sm text-muted-foreground">풀 리퀘스트가 없어요.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {prs.map(({ pr, author }) => (
            <li key={pr.id}>
              <Link
                href={`/n/${owner}/${slug}/pulls/${pr.number}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    #{pr.number} {pr.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {author.username} · {pr.sourceBranch} → {pr.targetBranch} ·{" "}
                    {formatDistanceToNow(pr.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <Badge
                  variant={
                    pr.status === "open"
                      ? "default"
                      : pr.status === "merged"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {statusLabel[pr.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
