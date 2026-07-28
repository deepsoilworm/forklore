import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelByOwnerSlug } from "@/lib/queries";
import { listBranches, listEpisodes } from "@/lib/git/novel-repo";
import { BranchSwitcher } from "@/components/branch-switcher";
import { Markdown } from "@/components/markdown";

export default async function ReadAllPage({
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
  const [branches, episodes] = await Promise.all([
    listBranches(found.novel.id),
    listEpisodes({ novelId: found.novel.id, ref: branch }),
  ]);

  if (episodes.length === 0) notFound();

  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${base}/read?branch=${encodeURIComponent(branch)}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {found.novel.name}
        </Link>
        <BranchSwitcher branches={branches} current={branch} />
      </div>

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
    </div>
  );
}
