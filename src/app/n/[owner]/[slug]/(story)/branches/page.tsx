import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listBranches } from "@/lib/git/novel-repo";
import { createBranchAction } from "@/lib/actions/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const session = await auth();
  const [branches, writable] = await Promise.all([
    listBranches(found.novel.id),
    session?.user?.id ? canWrite(found.novel, session.user.id) : false,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ul className="divide-y rounded-md border">
        {branches.map((b) => (
          <li key={b.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <Link
              href={`/n/${owner}/${slug}?branch=${encodeURIComponent(b.name)}`}
              className="font-mono hover:underline"
            >
              {b.name}
            </Link>
            <code className="text-xs text-muted-foreground">
              {b.commitSha.slice(0, 7)}
            </code>
          </li>
        ))}
      </ul>

      {writable && (
        <form action={createBranchAction} className="flex items-end gap-2">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="from" value={found.novel.defaultBranch} />
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs text-muted-foreground">
              새 브랜치 이름 ({found.novel.defaultBranch}에서 분기)
            </label>
            <Input id="name" name="name" placeholder="alt-ending" required className="w-64" />
          </div>
          <Button type="submit">브랜치 만들기</Button>
        </form>
      )}
    </div>
  );
}
