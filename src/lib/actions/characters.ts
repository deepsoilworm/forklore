"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { characterDevelopments, characters, encounterParticipants, encounters } from "@/db/schema";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getCharacter } from "@/lib/character-queries";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const characterSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  age: z.string().max(50).optional(),
  appearance: z.string().max(300).optional(),
  personality: z.string().max(300).optional(),
  goal: z.string().max(300).optional(),
  relationships: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
});

export async function saveCharacterAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = characterSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    age: formData.get("age") || undefined,
    appearance: formData.get("appearance") || undefined,
    personality: formData.get("personality") || undefined,
    goal: formData.get("goal") || undefined,
    relationships: formData.get("relationships") || undefined,
    description: formData.get("description") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const values = {
    name: parsed.name,
    age: parsed.age ?? null,
    appearance: parsed.appearance ?? null,
    personality: parsed.personality ?? null,
    goal: parsed.goal ?? null,
    relationships: parsed.relationships ?? null,
    description: parsed.description ?? null,
  };

  let characterId = parsed.id;
  if (characterId) {
    await db
      .update(characters)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(characters.id, characterId));
  } else {
    const [row] = await db
      .insert(characters)
      .values({ ...values, novelId: found.novel.id })
      .returning();
    characterId = row.id;
  }

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters`);
  redirect(`/n/${parsed.owner}/${parsed.slug}/characters/${characterId}`);
}

const encounterSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  order: z.coerce.number().int().optional(),
  participantIds: z.array(z.string().uuid()).min(1),
});

export async function createEncounterAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = encounterSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || undefined,
    participantIds: formData.getAll("participantIds"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  await db.transaction(async (tx) => {
    const [encounter] = await tx
      .insert(encounters)
      .values({
        novelId: found.novel.id,
        title: parsed.title,
        description: parsed.description,
        order: parsed.order ?? 0,
      })
      .returning();

    await tx.insert(encounterParticipants).values(
      parsed.participantIds.map((characterId) => ({
        encounterId: encounter.id,
        characterId,
      })),
    );
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/encounters`);
  redirect(`/n/${parsed.owner}/${parsed.slug}/encounters`);
}

const developmentSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  characterId: z.string().uuid(),
  label: z.string().min(1).max(50),
  note: z.string().min(1).max(500),
  order: z.coerce.number().int().optional(),
});

export async function addCharacterDevelopmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = developmentSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    characterId: formData.get("characterId"),
    label: formData.get("label"),
    note: formData.get("note"),
    order: formData.get("order") || undefined,
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const character = await getCharacter(found.novel.id, parsed.characterId);
  if (!character) throw new Error("인물을 찾을 수 없습니다");

  await db.insert(characterDevelopments).values({
    characterId: character.id,
    label: parsed.label,
    note: parsed.note,
    order: parsed.order ?? 0,
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters/${character.id}`);
}
