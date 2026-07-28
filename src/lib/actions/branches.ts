"use server";

import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { createBranch } from "@/lib/git/novel-repo";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  owner: z.string(),
  slug: z.string(),
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9._\-/]+$/, "브랜치 이름에는 영문/숫자/-._/ 만 사용할 수 있어요"),
  from: z.string().min(1),
});

export async function createBranchAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = schema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    from: formData.get("from"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  await createBranch({
    novelId: found.novel.id,
    name: parsed.name,
    from: parsed.from,
  });

  redirect(
    `/n/${parsed.owner}/${parsed.slug}?branch=${encodeURIComponent(parsed.name)}`,
  );
}
