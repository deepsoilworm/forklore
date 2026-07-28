import { notFound } from "next/navigation";
import Link from "next/link";
import { getNovelByOwnerSlug } from "@/lib/queries";
import { listIssues } from "@/lib/issue-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const statusLabel: Record<string, string> = { open: "열림", closed: "닫힘" };

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { owner, slug } = await params;
  const { status: statusParam } = await searchParams;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const status = statusParam === "closed" ? "closed" : statusParam === "all" ? undefined : "open";
  const issueList = await listIssues(found.novel.id, status);
  const base = `/n/${owner}/${slug}/issues`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <Link href={base}>
            <Badge variant={(status ?? "open") === "open" ? "default" : "outline"}>열림</Badge>
          </Link>
          <Link href={`${base}?status=closed`}>
            <Badge variant={status === "closed" ? "default" : "outline"}>닫힘</Badge>
          </Link>
          <Link href={`${base}?status=all`}>
            <Badge variant={statusParam === "all" ? "default" : "outline"}>
              전체
            </Badge>
          </Link>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href={`${base}/new`} />}>
          새 이슈
        </Button>
      </div>
      {issueList.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          이슈가 없어요.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {issueList.map(({ issue, author }) => (
            <li key={issue.id}>
              <Link
                href={`${base}/${issue.number}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    #{issue.number} {issue.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {author.username} ·{" "}
                    {formatDistanceToNow(issue.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={issue.status === "open" ? "default" : "outline"}>
                  {statusLabel[issue.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
