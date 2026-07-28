"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  characterChangeRequests,
  characterDevelopments,
  characterFields,
  characterRevisions,
  characters,
  encounterParticipants,
  encounters,
  plotLines,
} from "@/db/schema";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getCharacter, getCharacterChangeRequest, getCharacterRevision } from "@/lib/character-queries";
import { and, eq, inArray } from "drizzle-orm";
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

  // Editing an EXISTING character mirrors the chapter branch → PR → merge
  // flow: the owner can push straight through (equivalent to committing
  // to main), but anyone else's edit becomes a pending request the owner
  // has to approve before it actually changes the sheet. Creating a
  // brand-new character doesn't need review — there's nothing existing to
  // protect, same as committing a new file needing no PR.
  if (parsed.id && session.user.id !== found.novel.ownerId) {
    await db.insert(characterChangeRequests).values({
      characterId: parsed.id,
      authorId: session.user.id,
      name: parsed.name,
      description: parsed.description ?? null,
      fields,
    });
    revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.id}`);
    redirect(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.id}`);
  }

  // Multiple collaborators can edit the same character — snapshot what
  // it looked like right before this edit overwrites it, so it's
  // recoverable without relying on git (this data never lived in git
  // files to begin with).
  const previous = parsed.id ? await getCharacter(found.novel.id, parsed.id) : null;

  const characterId = await db.transaction(async (tx) => {
    let id = parsed.id;
    if (id) {
      if (previous) {
        await tx.insert(characterRevisions).values({
          characterId: id,
          name: previous.name,
          description: previous.description,
          fields: previous.fields.map((f) => ({ label: f.label, value: f.value })),
          authorId: session.user.id,
        });
      }
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

const restoreSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  characterId: z.string().uuid(),
  revisionId: z.string().uuid(),
});

export async function restoreCharacterRevisionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = restoreSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    characterId: formData.get("characterId"),
    revisionId: formData.get("revisionId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const [current, revision] = await Promise.all([
    getCharacter(found.novel.id, parsed.characterId),
    getCharacterRevision(parsed.characterId, parsed.revisionId),
  ]);
  if (!current || !revision) throw new Error("찾을 수 없습니다");

  const revisionFields = revision.fields as { label: string; value: string }[];

  await db.transaction(async (tx) => {
    // Restoring is just another edit — snapshot the current state too,
    // so restoring never destroys history, it only adds to it.
    await tx.insert(characterRevisions).values({
      characterId: current.id,
      name: current.name,
      description: current.description,
      fields: current.fields.map((f) => ({ label: f.label, value: f.value })),
      authorId: session.user.id,
    });

    await tx
      .update(characters)
      .set({ name: revision.name, description: revision.description, updatedAt: new Date() })
      .where(eq(characters.id, current.id));
    await tx.delete(characterFields).where(eq(characterFields.characterId, current.id));
    if (revisionFields.length > 0) {
      await tx.insert(characterFields).values(
        revisionFields.map((f, i) => ({
          characterId: current.id,
          label: f.label,
          value: f.value,
          order: i,
        })),
      );
    }
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.characterId}`);
  redirect(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.characterId}`);
}

const resolveRequestSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  characterId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export async function approveCharacterChangeRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = resolveRequestSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    characterId: formData.get("characterId"),
    requestId: formData.get("requestId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (session.user.id !== found.novel.ownerId) {
    throw new Error("소유자만 변경 요청을 승인할 수 있어요");
  }

  const [current, request] = await Promise.all([
    getCharacter(found.novel.id, parsed.characterId),
    getCharacterChangeRequest(parsed.characterId, parsed.requestId),
  ]);
  if (!current || !request || request.status !== "pending") throw new Error("찾을 수 없습니다");

  const requestFields = request.fields as { label: string; value: string }[];

  await db.transaction(async (tx) => {
    // Snapshot what the sheet looked like right before this request is
    // applied — same reasoning as every other edit path.
    await tx.insert(characterRevisions).values({
      characterId: current.id,
      name: current.name,
      description: current.description,
      fields: current.fields.map((f) => ({ label: f.label, value: f.value })),
      authorId: session.user!.id,
    });

    await tx
      .update(characters)
      .set({ name: request.name, description: request.description, updatedAt: new Date() })
      .where(eq(characters.id, current.id));
    await tx.delete(characterFields).where(eq(characterFields.characterId, current.id));
    if (requestFields.length > 0) {
      await tx.insert(characterFields).values(
        requestFields.map((f, i) => ({
          characterId: current.id,
          label: f.label,
          value: f.value,
          order: i,
        })),
      );
    }

    await tx
      .update(characterChangeRequests)
      .set({ status: "approved", resolvedAt: new Date(), resolvedById: session.user!.id })
      .where(eq(characterChangeRequests.id, request.id));
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.characterId}`);
  redirect(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.characterId}`);
}

export async function rejectCharacterChangeRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = resolveRequestSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    characterId: formData.get("characterId"),
    requestId: formData.get("requestId"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (session.user.id !== found.novel.ownerId) {
    throw new Error("소유자만 변경 요청을 거절할 수 있어요");
  }

  await db
    .update(characterChangeRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedById: session.user.id })
    .where(
      and(
        eq(characterChangeRequests.id, parsed.requestId),
        eq(characterChangeRequests.characterId, parsed.characterId),
      ),
    );

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/characters/${parsed.characterId}`);
}

const encounterSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  plotLineId: z.string().uuid().optional(),
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
    plotLineId: formData.get("plotLineId") || undefined,
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
        plotLineId: parsed.plotLineId ?? null,
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

const plotLineSchema = z.object({
  owner: z.string(),
  slug: z.string(),
  name: z.string().min(1).max(80),
});

export async function createPlotLineAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const parsed = plotLineSchema.parse({
    owner: formData.get("owner"),
    slug: formData.get("slug"),
    name: formData.get("name"),
  });

  const found = await getNovelByOwnerSlug(parsed.owner, parsed.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  const existing = await db
    .select()
    .from(plotLines)
    .where(eq(plotLines.novelId, found.novel.id));

  await db.insert(plotLines).values({
    novelId: found.novel.id,
    name: parsed.name,
    order: existing.length,
  });

  revalidatePath(`/n/${parsed.owner}/${parsed.slug}/encounters`);
}

// Called on drag-and-drop drop: persists the full ordered list of encounter
// ids for whichever track the card was dropped into (including its new
// plotLineId). The source track's remaining cards keep their old `order`
// values — those don't need to be contiguous, only locally monotonic.
export async function reorderEncountersAction(input: {
  owner: string;
  slug: string;
  plotLineId: string | null;
  orderedEncounterIds: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const found = await getNovelByOwnerSlug(input.owner, input.slug);
  if (!found) throw new Error("이야기를 찾을 수 없습니다");
  if (!(await canWrite(found.novel, session.user.id))) {
    throw new Error("쓰기 권한이 없습니다");
  }

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: encounters.id })
      .from(encounters)
      .where(
        and(eq(encounters.novelId, found.novel.id), inArray(encounters.id, input.orderedEncounterIds)),
      );
    const validIds = new Set(rows.map((r) => r.id));

    await Promise.all(
      input.orderedEncounterIds
        .filter((id) => validIds.has(id))
        .map((id, index) =>
          tx
            .update(encounters)
            .set({ plotLineId: input.plotLineId, order: index })
            .where(eq(encounters.id, id)),
        ),
    );
  });

  revalidatePath(`/n/${input.owner}/${input.slug}/encounters`);
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
