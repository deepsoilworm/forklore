import { db } from "@/db";
import { characterDevelopments, characters, encounterParticipants, encounters } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export async function listCharacters(novelId: string) {
  return db
    .select()
    .from(characters)
    .where(eq(characters.novelId, novelId))
    .orderBy(asc(characters.name));
}

export async function getCharacter(novelId: string, characterId: string) {
  const [row] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.novelId, novelId)))
    .limit(1);
  return row ?? null;
}

export async function listCharacterDevelopments(characterId: string) {
  return db
    .select()
    .from(characterDevelopments)
    .where(eq(characterDevelopments.characterId, characterId))
    .orderBy(asc(characterDevelopments.order), asc(characterDevelopments.createdAt));
}

export type EncounterWithParticipants = {
  encounter: typeof encounters.$inferSelect;
  participants: (typeof characters.$inferSelect)[];
};

export async function listEncounters(novelId: string): Promise<EncounterWithParticipants[]> {
  const rows = await db
    .select()
    .from(encounters)
    .where(eq(encounters.novelId, novelId))
    .orderBy(asc(encounters.order), asc(encounters.createdAt));
  if (rows.length === 0) return [];

  const participantRows = await db
    .select({ encounterId: encounterParticipants.encounterId, character: characters })
    .from(encounterParticipants)
    .innerJoin(characters, eq(encounterParticipants.characterId, characters.id))
    .where(
      inArray(
        encounterParticipants.encounterId,
        rows.map((r) => r.id),
      ),
    );

  return rows.map((encounter) => ({
    encounter,
    participants: participantRows
      .filter((p) => p.encounterId === encounter.id)
      .map((p) => p.character),
  }));
}

export async function listEncountersForCharacter(
  characterId: string,
): Promise<EncounterWithParticipants[]> {
  const encounterIds = await db
    .select({ encounterId: encounterParticipants.encounterId })
    .from(encounterParticipants)
    .where(eq(encounterParticipants.characterId, characterId));
  if (encounterIds.length === 0) return [];

  const rows = await db
    .select()
    .from(encounters)
    .where(
      inArray(
        encounters.id,
        encounterIds.map((r) => r.encounterId),
      ),
    )
    .orderBy(asc(encounters.order), asc(encounters.createdAt));

  const participantRows = await db
    .select({ encounterId: encounterParticipants.encounterId, character: characters })
    .from(encounterParticipants)
    .innerJoin(characters, eq(encounterParticipants.characterId, characters.id))
    .where(
      inArray(
        encounterParticipants.encounterId,
        rows.map((r) => r.id),
      ),
    );

  return rows.map((encounter) => ({
    encounter,
    participants: participantRows
      .filter((p) => p.encounterId === encounter.id)
      .map((p) => p.character),
  }));
}
