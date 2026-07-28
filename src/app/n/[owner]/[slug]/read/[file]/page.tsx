import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listEpisodes } from "@/lib/git/novel-repo";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";

export default async function ReadEpisodePage({
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
  const [session, episodes] = await Promise.all([
    auth(),
    listEpisodes({ novelId: found.novel.id, ref: branch }),
  ]);

  const decodedFile = decodeURIComponent(file);
  const episodeIndex = episodes.findIndex((ep) => ep.file === decodedFile);
  if (episodeIndex === -1) notFound();
  const episode = episodes[episodeIndex];
  const prev = episodes[episodeIndex - 1];
  const next = episodes[episodeIndex + 1];

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;
  const branchQuery = `branch=${encodeURIComponent(branch)}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`${base}/read?${branchQuery}`} className="text-sm text-muted-foreground hover:underline">
          ← 목차로
        </Link>
        {writable && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`${base}/edit?${branchQuery}&path=${encodeURIComponent(episode.path)}`}
              />
            }
          >
            편집
          </Button>
        )}
      </div>

      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {episode.index}화 — {episode.title}
        </h1>
        <Markdown content={episode.content} />
      </article>

      <nav className="flex items-center justify-between border-t pt-4 text-sm">
        {prev ? (
          <Link
            href={`${base}/read/${encodeURIComponent(prev.file)}?${branchQuery}`}
            className="hover:underline"
          >
            ← {prev.index}화 {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`${base}/read/${encodeURIComponent(next.file)}?${branchQuery}`}
            className="hover:underline"
          >
            {next.index}화 {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
