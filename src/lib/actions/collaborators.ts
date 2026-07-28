"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { collaborators, users } from "@/db/schema";
import { getNovelByOwnerSlug } from "@/lib/queries";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const inviteSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  username: z
    .string()
    .min(1)
    .transform((v) => v.trim().replace(/^@/, "")),
  // "owner" is reserved for novels.ownerId itself, not assignable here.
  role: z.enum(["maintainer", "writer", "reader"]),
});

export async function inviteCollaboratorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = inviteSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    username: formData.get("username"),
    role: formData.get("role"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (found.novel.ownerId !== session.user.id) {
    throw new Error("협업자 관리는 작성자만 할 수 있습니다");
  }

  const [target] = await db.select().from(users).where(eq(users.username, parsed.username)).limit(1);
  if (!target) throw new Error("해당 유저네임을 찾을 수 없습니다");
  if (target.id === found.novel.ownerId) {
    throw new Error("작성자는 이미 모든 권한을 가지고 있어요");
  }

  await db
    .insert(collaborators)
    .values({ novelId: found.novel.id, userId: target.id, role: parsed.role })
    .onConflictDoUpdate({
      target: [collaborators.novelId, collaborators.userId],
      set: { role: parsed.role },
    });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/collaborators`);
}

const removeSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  userId: z.string().uuid(),
});

export async function removeCollaboratorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = removeSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    userId: formData.get("userId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (found.novel.ownerId !== session.user.id) {
    throw new Error("협업자 관리는 작성자만 할 수 있습니다");
  }

  await db
    .delete(collaborators)
    .where(and(eq(collaborators.novelId, found.novel.id), eq(collaborators.userId, parsed.userId)));

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/collaborators`);
}
