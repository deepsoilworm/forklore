import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getChapterContent, listEpisodes } from "@/lib/git/novel-repo";
import { splitTitleAndBody } from "@/lib/markdown-utils";
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

  let filepath = path;
  let title = "";
  let body = "";

  if (path) {
    const content = await getChapterContent({ novelId: found.novel.id, ref: branch, filepath: path });
    const split = splitTitleAndBody(content ?? "");
    title = split.title;
    body = split.body;
  } else {
    // New chapter: auto-number the file so writers never see file paths.
    const episodes = await listEpisodes({ novelId: found.novel.id, ref: branch });
    const nextNumber = String(episodes.length + 1).padStart(2, "0");
    filepath = `chapters/${nextNumber}.md`;
  }

  return (
    <ChapterEditorForm
      owner={owner}
      slug={slug}
      branch={branch}
      path={filepath!}
      isNew={!path}
      initialTitle={title}
      initialBody={body}
    />
  );
}
