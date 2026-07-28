"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  characterDevelopments,
  characterFields,
  characters,
  encounterParticipants,
  encounters,
} from "@/db/schema";
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
  description: z.string().max(2000).optional(),
  fieldLabel: z.array(z.string().max(50)),
  fieldValue: z.array(z.string().max(300)),
});

export async function saveCharacterAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = characterSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    fieldLabel: formData.getAll("fieldLabel"),
    fieldValue: formData.getAll("fieldValue"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const fields = parsed.fieldLabel
    .map((label, i) => ({ label: label.trim(), value: parsed.fieldValue[i]?.trim() ?? "" }))
    .filter((f) => f.label && f.value);

  const values = { name: parsed.name, description: parsed.description ?? null };

  const characterId = await db.transaction(async (tx) => {
    let id = parsed.id;
    if (id) {
      await tx.update(characters).set({ ...values, updatedAt: new Date() }).where(eq(characters.id, id));
      await tx.delete(characterFields).where(eq(characterFields.characterId, id));
    } else {
      const [row] = await tx
        .insert(characters)
        .values({ ...values, novelId: found.novel.id })
        .returning();
      id = row.id;
    }

    if (fields.length > 0) {
      await tx.insert(characterFields).values(
        fields.map((f, i) => ({ characterId: id!, label: f.label, value: f.value, order: i })),
      );
    }

    return id;
  });

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
