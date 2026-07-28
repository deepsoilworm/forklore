import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listEpisodes } from "@/lib/git/novel-repo";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { EpisodePoll } from "@/components/episode-poll";
import { EpisodeComments } from "@/components/episode-comments";

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${base}/read?${branchQuery}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
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
        <p className="text-sm font-medium text-muted-foreground">{episode.index}화</p>
        <Markdown content={episode.content} size="reading" />
      </article>

      <EpisodePoll
        owner={owner}
        slug={slug}
        novelId={found.novel.id}
        episodePath={episode.path}
      />

      <nav className="grid grid-cols-2 gap-3 border-t pt-6 text-sm">
        {prev ? (
          <Link
            href={`${base}/read/${encodeURIComponent(prev.file)}?${branchQuery}`}
            className="flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/50"
          >
            <span className="text-xs text-muted-foreground">← 이전화</span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`${base}/read/${encodeURIComponent(next.file)}?${branchQuery}`}
            className="flex flex-col items-end gap-0.5 rounded-lg border px-3 py-2.5 text-right transition-colors hover:border-foreground/20 hover:bg-accent/50"
          >
            <span className="text-xs text-muted-foreground">다음화 →</span>
            <span className="font-medium">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="border-t pt-6">
        <EpisodeComments
          owner={owner}
          slug={slug}
          novelId={found.novel.id}
          episodePath={episode.path}
        />
      </div>
    </div>
  );
}
