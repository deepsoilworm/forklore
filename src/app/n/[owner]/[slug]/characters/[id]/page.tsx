import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getCharacter, listEncountersForCharacter } from "@/lib/character-queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FIELDS: { key: "age" | "appearance" | "personality" | "goal" | "relationships"; label: string }[] = [
  { key: "age", label: "나이" },
  { key: "appearance", label: "외모" },
  { key: "personality", label: "성격" },
  { key: "goal", label: "목표" },
  { key: "relationships", label: "관계" },
];

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; id: string }>;
}) {
  const { owner, slug, id } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const character = await getCharacter(found.novel.id, id);
  if (!character) notFound();

  const [session, encounters] = await Promise.all([
    auth(),
    listEncountersForCharacter(character.id),
  ]);
  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${base}/characters`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 인물 목록으로
        </Link>
        {writable && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${base}/characters/${character.id}/edit`} />}
          >
            편집
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{character.name}</h1>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="mt-0.5">{character[f.key] || "—"}</dd>
            </div>
          ))}
        </dl>
        {character.description && (
          <p className="whitespace-pre-wrap border-t pt-4 text-sm leading-7">
            {character.description}
          </p>
        )}
      </div>

      {encounters.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-6">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">등장한 만남</h2>
          <ul className="flex flex-col gap-1.5">
            {encounters.map(({ encounter, participants }) => (
              <li
                key={encounter.id}
                className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm"
              >
                <span className="font-medium">{encounter.title}</span>
                <div className="flex flex-wrap gap-1">
                  {participants.map((p) => (
                    <Badge key={p.id} variant={p.id === character.id ? "default" : "outline"}>
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
