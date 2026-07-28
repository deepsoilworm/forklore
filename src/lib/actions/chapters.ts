"use server";

import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { commitChapter } from "@/lib/git/novel-repo";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  owner: z.string(),
  slug: z.string(),
  branch: z.string().min(1),
  filepath: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9._\-/]+\.md$/, "파일명은 .md로 끝나야 해요"),
  content: z.string(),
  message: z.string().max(200).optional(),
});

export async function commitChapterAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = schema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    branch: formData.get("branch"),
    filepath: formData.get("filepath"),
    content: formData.get("content") ?? "",
    message: formData.get("message") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const title = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const message = parsed.message || (title ? `${title} 저장` : "회차 저장");

  await commitChapter({
    novelId: found.novel.id,
    branch: parsed.branch,
    filepath: parsed.filepath,
    content: parsed.content,
    message,
    author: {
      name: session.user.name ?? session.user.username ?? "anonymous",
      email:
        session.user.email ?? `${session.user.username}@users.forklore.dev`,
    },
    authorUserId: session.user.id,
  });

  const file = parsed.filepath.startsWith("chapters/")
    ? parsed.filepath.slice("chapters/".length)
    : null;
  const branchQuery = `branch=${encodeURIComponent(parsed.branch)}`;

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}`);
  redirect(
    file
      ? `/n/${parsed.owner}/${parsed.slug}/read/${encodeURIComponent(file)}?${branchQuery}`
      : `/n/${parsed.owner}/${parsed.slug}/read?${branchQuery}`,
  );
}
