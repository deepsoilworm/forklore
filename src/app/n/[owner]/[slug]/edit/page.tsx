import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getChapterContent } from "@/lib/git/novel-repo";
import { ChapterEditorForm } from "@/components/chapter-editor-form";

export default async function EditChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams: Promise<{ branch?: string; path?: string }>;
}) {
  const { owner, slug } = await params;
  const { branch: branchParam, path } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}`);
  }

  const branch = branchParam || found.novel.defaultBranch;
  const content = path
    ? await getChapterContent({ novelId: found.novel.id, ref: branch, filepath: path })
    : "";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">
        {path ? `${path} 편집` : "새 챕터"} — 브랜치 {branch}
      </h2>
      <ChapterEditorForm
        owner={owner}
        slug={slug}
        branch={branch}
        novelId={found.novel.id}
        path={path ?? null}
        initialContent={content ?? ""}
      />
    </div>
  );
}
