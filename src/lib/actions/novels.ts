"use server";

import { auth } from "@/auth";
import { createNovel } from "@/lib/git/novel-repo";
import { categoryEnum, languageEnum } from "@/db/schema";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "소문자, 숫자, 하이픈만 사용할 수 있어요"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]),
  category: z.enum(categoryEnum.enumValues),
  language: z.enum(languageEnum.enumValues),
});

export async function createNovelAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.username) {
    throw new Error("로그인이 필요합니다");
  }

  const parsed = schema.parse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    visibility: formData.get("visibility") === "private" ? "private" : "public",
    category: formData.get("category") || "other",
    language: formData.get("language") || "ko",
  });

  const novel = await createNovel({
    ownerId: session.user.id,
    slug: parsed.slug,
    name: parsed.name,
    description: parsed.description,
    visibility: parsed.visibility,
    category: parsed.category,
    language: parsed.language,
    author: {
      name: session.user.name ?? session.user.username,
      email: session.user.email ?? `${session.user.username}@users.forklore.dev`,
    },
  });

  redirect(`/n/${session.user.username}/${novel.slug}/read`);
}
