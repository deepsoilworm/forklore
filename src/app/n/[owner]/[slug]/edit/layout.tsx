import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listEpisodes } from "@/lib/git/novel-repo";
import { MobileMenuTrigger } from "@/components/mobile-menu-trigger";

export default async function EditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}`);
  }

  const branch = found.novel.defaultBranch;
  const episodes = await listEpisodes({ novelId: found.novel.id, ref: branch });
  const base = `/n/${owner}/${slug}`;
  const branchQuery = `branch=${encodeURIComponent(branch)}`;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2 sm:hidden">
        <MobileMenuTrigger />
        <Link
          href={`${base}/read?${branchQuery}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {found.novel.name}
        </Link>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r px-3 py-4 sm:flex">
          <Link
            href={`${base}/read?${branchQuery}`}
            className="mb-3 px-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            ← {found.novel.name}
          </Link>
          <Link
            href={`${base}/edit?${branchQuery}`}
            className="mb-2 rounded-md bg-foreground px-2.5 py-1.5 text-center text-xs font-medium text-background hover:opacity-90"
          >
            + 새 회차
          </Link>
          {episodes.map((ep) => (
            <Link
              key={ep.path}
              href={`${base}/edit?${branchQuery}&path=${encodeURIComponent(ep.path)}`}
              className="truncate rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              {ep.index}. {ep.title}
            </Link>
          ))}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
