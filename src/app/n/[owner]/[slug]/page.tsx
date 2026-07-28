import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import {
  getChapterContent,
  listBranches,
  listMarkdownFiles,
} from "@/lib/git/novel-repo";
import { Button } from "@/components/ui/button";
import { BranchSwitcher } from "@/components/branch-switcher";

export default async function NovelOverviewPage({
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
  const [session, branches, chapters, readme] = await Promise.all([
    auth(),
    listBranches(found.novel.id),
    listMarkdownFiles({ novelId: found.novel.id, ref: branch, prefix: "chapters/" }),
    getChapterContent({
      novelId: found.novel.id,
      ref: branch,
      filepath: "README.md",
    }),
  ]);

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BranchSwitcher branches={branches} current={branch} />
        {writable && (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`${base}/edit?branch=${encodeURIComponent(branch)}`} />}
          >
            새 챕터 쓰기
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
          챕터
        </div>
        {chapters.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            아직 챕터가 없어요.
          </p>
        ) : (
          <ul className="divide-y">
            {chapters.map((path) => {
              const file = path.slice("chapters/".length);
              return (
                <li key={path} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <Link
                    href={`${base}/read/${encodeURIComponent(file)}?branch=${encodeURIComponent(branch)}`}
                    className="hover:bg-accent/50"
                  >
                    {path}
                  </Link>
                  {writable && (
                    <Link
                      href={`${base}/edit?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      편집
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {readme && (
        <article className="rounded-md border p-4 text-sm whitespace-pre-wrap">
          {readme}
        </article>
      )}
    </div>
  );
}
