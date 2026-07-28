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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BranchSwitcher branches={branches} current={branch} />
        <Badge variant="secondary">{episodes.length}화 연재 중</Badge>
      </div>

      {readme && (
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{found.novel.name}</h1>
          <Markdown content={readme} />
        </header>
      )}

      <div className="rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">목차</div>
        {episodes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            아직 연재된 회차가 없어요.
          </p>
        ) : (
          <ul className="divide-y">
            {episodes.map((ep) => (
              <li key={ep.path}>
                <Link
                  href={`${base}/read/${encodeURIComponent(ep.file)}?branch=${encodeURIComponent(branch)}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50"
                >
                  <span className="text-muted-foreground">{ep.index}화</span>
                  <span>{ep.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {episodes.length > 0 && (
        <article className="flex flex-col gap-12">
          {episodes.map((ep) => (
            <section key={ep.path} id={`ep-${ep.index}`} className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {ep.index}화 — {ep.title}
              </h2>
              <Markdown content={ep.content} />
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
