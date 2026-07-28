import { notFound } from "next/navigation";
import { getNovelByOwnerSlug } from "@/lib/queries";
import { getHistory, listBranches } from "@/lib/git/novel-repo";
import { BranchSwitcher } from "@/components/branch-switcher";
import { formatDistanceToNow } from "date-fns";

export default async function CommitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { owner, slug } = await params;
  const { branch: branchParam } = await searchParams;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const branch = branchParam || found.novel.defaultBranch;
  const [branches, history] = await Promise.all([
    listBranches(found.novel.id),
    getHistory({ novelId: found.novel.id, ref: branch, depth: 100 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <BranchSwitcher branches={branches} current={branch} />
      <ul className="divide-y rounded-md border">
        {history.map((c) => (
          <li key={c.oid} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{c.commit.message.trim()}</p>
              <p className="text-xs text-muted-foreground">
                {c.commit.author.name} ·{" "}
                {formatDistanceToNow(new Date(c.commit.author.timestamp * 1000), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <code className="text-xs text-muted-foreground">{c.oid.slice(0, 7)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
