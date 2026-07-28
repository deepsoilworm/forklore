import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listCharacters, listEncounters } from "@/lib/character-queries";
import { createEncounterAction } from "@/lib/actions/characters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function EncountersPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const session = await auth();
  const [writable, encounters, characterList] = await Promise.all([
    session?.user?.id ? canWrite(found.novel, session.user.id) : false,
    listEncounters(found.novel.id),
    listCharacters(found.novel.id),
  ]);

  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">타임라인</h2>
        {encounters.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            아직 기록된 만남이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {encounters.map(({ encounter, participants }) => (
              <li key={encounter.id} className="flex flex-col gap-2 rounded-lg border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{encounter.title}</span>
                  <div className="flex flex-wrap gap-1">
                    {participants.map((p) => (
                      <Link key={p.id} href={`${base}/characters/${p.id}`}>
                        <Badge variant="outline">{p.name}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
                {encounter.description && (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {encounter.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {writable &&
        (characterList.length < 1 ? (
          <p className="text-sm text-muted-foreground">
            만남을 기록하려면 먼저{" "}
            <Link href={`${base}/characters/new`} className="underline">
              인물을 등록
            </Link>
            하세요.
          </p>
        ) : (
          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              새 만남 기록하기
            </summary>
            <form action={createEncounterAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="owner" value={owner} />
              <input type="hidden" name="slug" value={slug} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" name="title" required maxLength={150} placeholder="여우와의 첫 만남" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>참여 인물</Label>
                <div className="flex flex-wrap gap-3">
                  {characterList.map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="participantIds" value={c.id} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">설명</Label>
                <Textarea id="description" name="description" rows={4} maxLength={2000} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="order">순서 (타임라인 정렬용, 선택)</Label>
                <Input id="order" name="order" type="number" defaultValue={encounters.length} />
              </div>
              <Button type="submit" size="sm" className="self-start">
                만남 추가
              </Button>
            </form>
          </details>
        ))}
    </div>
  );
}
