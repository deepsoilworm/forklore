import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  canWrite,
  getNovelByOwnerSlug,
  isStarredByUser,
  listOtherNovelsByOwner,
} from "@/lib/queries";
import { getChapterContent, listBranches, listEpisodes } from "@/lib/git/novel-repo";
import { BranchSwitcher } from "@/components/branch-switcher";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusSwitcher } from "@/components/status-switcher";
import { stripLeadingHeading } from "@/lib/markdown-utils";
import { CATEGORY_LABELS, LANGUAGE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { storyStatusEnum } from "@/db/schema";
import { toggleStarAction } from "@/lib/actions/engagement";

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
  const session = await auth();
  const [branches, episodes, readme, starred, otherWorks] = await Promise.all([
    listBranches(found.novel.id),
    listEpisodes({ novelId: found.novel.id, ref: branch }),
    getChapterContent({ novelId: found.novel.id, ref: branch, filepath: "README.md" }),
    isStarredByUser(found.novel.id, session?.user?.id ?? null),
    listOtherNovelsByOwner(found.novel.ownerId, found.novel.id),
  ]);

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;
  const branchQuery = `branch=${encodeURIComponent(branch)}`;
  const writeHref = `${base}/edit?${branchQuery}`;
  const firstEpisodeHref = episodes[0]
    ? `${base}/read/${encodeURIComponent(episodes[0].file)}?${branchQuery}`
    : null;
  const totalChars = episodes.reduce(
    (sum, ep) => sum + ep.content.replace(/\s/g, "").length,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex items-start gap-5">
        <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/40 text-3xl font-bold text-muted-foreground sm:h-36 sm:w-28 sm:text-4xl">
          {found.novel.name.trim()[0]?.toUpperCase()}
        </div>
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{STATUS_LABELS[found.novel.status]}</Badge>
            <Badge variant="outline">{CATEGORY_LABELS[found.novel.category]}</Badge>
            <Badge variant="outline">{LANGUAGE_LABELS[found.novel.language]}</Badge>
            {writable && (
              <StatusSwitcher
                owner={owner}
                slug={slug}
                status={found.novel.status}
                options={storyStatusEnum.enumValues}
              />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {found.novel.name}
          </h1>
          <Link href={`/u/${owner}`} className="text-sm text-muted-foreground hover:underline">
            @{owner}
          </Link>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{episodes.length}화</span>
            <span>{totalChars.toLocaleString()}자</span>
            <span>찜 {found.novel.starCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {readme && stripLeadingHeading(readme).trim() && (
        <Markdown content={stripLeadingHeading(readme)} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {firstEpisodeHref && (
          <Button nativeButton={false} render={<Link href={firstEpisodeHref} />}>
            첫화보기
          </Button>
        )}
        {session?.user && (
          <form action={toggleStarAction}>
            <input type="hidden" name="owner" value={owner} />
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit" variant={starred ? "default" : "outline"}>
              {starred ? "찜 완료" : "찜하기"}
            </Button>
          </form>
        )}
        {writable && (
          <Button variant="outline" nativeButton={false} render={<Link href={writeHref} />}>
            새 회차 쓰기
          </Button>
        )}
        <div className="ml-auto">
          <BranchSwitcher branches={branches} current={branch} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground">목차</h2>
          {episodes.length > 0 && (
            <Link
              href={`${base}/read/all?${branchQuery}`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              전체 보기 →
            </Link>
          )}
        </div>
        {episodes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <p>아직 연재된 회차가 없어요.</p>
            {writable && (
              <Button size="sm" nativeButton={false} render={<Link href={writeHref} />}>
                첫 회차 쓰러 가기
              </Button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {episodes.map((ep) => (
              <li key={ep.path}>
                <Link
                  href={`${base}/read/${encodeURIComponent(ep.file)}?${branchQuery}`}
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

      {otherWorks.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-6">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            {owner}님의 다른 작품
          </h2>
          <ul className="flex flex-col gap-1.5">
            {otherWorks.map(({ novel }) => (
              <li key={novel.id}>
                <Link
                  href={`/n/${owner}/${novel.slug}/read`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-foreground/20 hover:bg-accent/50"
                >
                  <span className="font-medium">{novel.name}</span>
                  <Badge variant="outline">{CATEGORY_LABELS[novel.category]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
