import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getChapterContent } from "@/lib/git/novel-repo";
import { CHARACTER_TEMPLATE } from "@/lib/git/templates";
import { ChapterEditorForm } from "@/components/chapter-editor-form";

export default async function EditChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams: Promise<{ branch?: string; path?: string; kind?: string }>;
}) {
  const { owner, slug } = await params;
  const { branch: branchParam, path, kind: kindParam } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}`);
  }

  const kind = kindParam === "character" ? "character" : "chapter";
  const branch = branchParam || found.novel.defaultBranch;
  const content = path
    ? await getChapterContent({ novelId: found.novel.id, ref: branch, filepath: path })
    : kind === "character"
      ? CHARACTER_TEMPLATE
      : "";

  const label = kind === "character" ? "인물" : "챕터";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mx-auto w-full max-w-2xl text-lg font-medium">
        {path ? `${path} 편집` : `새 ${label}`} — 브랜치 {branch}
      </h2>
      <ChapterEditorForm
        owner={owner}
        slug={slug}
        branch={branch}
        path={path ?? null}
        defaultFilepathPrefix={kind === "character" ? "characters/" : "chapters/"}
        initialContent={content ?? ""}
      />
    </div>
  );
}
