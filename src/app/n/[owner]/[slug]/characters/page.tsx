import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listBranches, listMarkdownFiles } from "@/lib/git/novel-repo";
import { Button } from "@/components/ui/button";
import { BranchSwitcher } from "@/components/branch-switcher";

export default async function CharactersPage({
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
  const [session, branches, characters] = await Promise.all([
    auth(),
    listBranches(found.novel.id),
    listMarkdownFiles({ novelId: found.novel.id, ref: branch, prefix: "characters/" }),
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
            render={
              <Link
                href={`${base}/edit?branch=${encodeURIComponent(branch)}&kind=character`}
              />
            }
          >
            새 인물 만들기
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
          인물
        </div>
        {characters.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            아직 등록된 인물이 없어요. 이름, 관계, 설정을 정리해두면 협업자들과 일관성을
            맞추기 쉬워져요.
          </p>
        ) : (
          <ul className="divide-y">
            {characters.map((path) => (
              <li key={path}>
                <Link
                  href={`${base}/edit?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&kind=character`}
                  className="flex items-center px-4 py-2.5 text-sm hover:bg-accent/50"
                >
                  {path}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
