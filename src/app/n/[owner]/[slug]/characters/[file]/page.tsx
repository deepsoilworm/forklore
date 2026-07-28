import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getChapterContent } from "@/lib/git/novel-repo";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";

export default async function CharacterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string; file: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { owner, slug, file } = await params;
  const { branch: branchParam } = await searchParams;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const branch = branchParam || found.novel.defaultBranch;
  const path = `characters/${decodeURIComponent(file)}`;
  const [session, content] = await Promise.all([
    auth(),
    getChapterContent({ novelId: found.novel.id, ref: branch, filepath: path }),
  ]);
  if (content === null) notFound();

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;
  const branchQuery = `branch=${encodeURIComponent(branch)}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${base}/characters?${branchQuery}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 인물 목록으로
        </Link>
        {writable && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${base}/edit?${branchQuery}&path=${encodeURIComponent(path)}`} />}
          >
            편집
          </Button>
        )}
      </div>

      <Markdown content={content} size="reading" />
    </div>
  );
}
