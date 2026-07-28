import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelByOwnerSlug } from "@/lib/queries";
import {
  getChapterContent,
  listBranches,
  listEpisodes,
} from "@/lib/git/novel-repo";
import { BranchSwitcher } from "@/components/branch-switcher";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";

export default async function ReadNovelPage({
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
  const [branches, episodes, readme] = await Promise.all([
    listBranches(found.novel.id),
    listEpisodes({ novelId: found.novel.id, ref: branch }),
    getChapterContent({ novelId: found.novel.id, ref: branch, filepath: "README.md" }),
  ]);

  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BranchSwitcher branches={branches} current={branch} />
        <Badge variant="secondary">{episodes.length}화 연재 중</Badge>
      </div>

      {readme && (
        <header className="flex flex-col gap-3 border-b pb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{found.novel.name}</h1>
          <Markdown content={readme} />
        </header>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">목차</h2>
        {episodes.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            아직 연재된 회차가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {episodes.map((ep) => (
              <li key={ep.path}>
                <Link
                  href={`${base}/read/${encodeURIComponent(ep.file)}?branch=${encodeURIComponent(branch)}`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-foreground/20 hover:bg-accent/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {ep.index}
                  </span>
                  <span className="font-medium">{ep.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {episodes.length > 0 && (
        <article className="flex flex-col">
          {episodes.map((ep, i) => (
            <section key={ep.path} id={`ep-${ep.index}`} className="flex flex-col gap-6">
              {i > 0 && (
                <div className="flex items-center justify-center py-10 text-muted-foreground/50">
                  · · ·
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">{ep.index}화</p>
              <Markdown content={ep.content} size="reading" />
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
