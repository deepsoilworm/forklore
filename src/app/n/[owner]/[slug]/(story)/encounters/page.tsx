import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listCharacters, listEncounters, listPlotLines } from "@/lib/character-queries";
import { createEncounterAction, createPlotLineAction } from "@/lib/actions/characters";
import { EncounterTimeline, UNASSIGNED } from "@/components/encounter-timeline";
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
  const [writable, encounters, characterList, plotLineList] = await Promise.all([
    session?.user?.id ? canWrite(found.novel, session.user.id) : false,
    listEncounters(found.novel.id),
    listCharacters(found.novel.id),
    listPlotLines(found.novel.id),
  ]);

  const tracks = [
    ...plotLineList.map((pl) => ({ key: pl.id, name: pl.name, plotLineId: pl.id })),
    { key: UNASSIGNED, name: "미분류", plotLineId: null },
  ];

  const grouped = new Map<string, typeof encounters>();
  for (const e of encounters) {
    const key = e.encounter.plotLineId ?? UNASSIGNED;
    grouped.set(key, [...(grouped.get(key) ?? []), e]);
  }
  for (const [key, list] of grouped) {
    grouped.set(
      key,
      [...list].sort((a, b) => a.encounter.order - b.encounter.order),
    );
  }

  const lanes = Object.fromEntries(
    tracks.map((t) => [t.key, (grouped.get(t.key) ?? []).map((e) => e.encounter.id)]),
  );
  const cards = Object.fromEntries(
    encounters.map((e) => [
      e.encounter.id,
      { id: e.encounter.id, title: e.encounter.title, participantNames: e.participants.map((p) => p.name) },
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground">타임라인</h2>
          {writable && (
            <details className="relative">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                + 플롯라인 추가
              </summary>
              <form
                action={createPlotLineAction}
                className="absolute right-0 z-10 mt-2 flex gap-2 rounded-lg border bg-background p-2 shadow-md"
              >
                <input type="hidden" name="owner" value={owner} />
                <input type="hidden" name="slug" value={slug} />
                <Input name="name" required maxLength={80} placeholder="서브플롯: 정체" className="h-8 w-48 text-sm" />
                <Button type="submit" size="sm">
                  추가
                </Button>
              </form>
            </details>
          )}
        </div>
        {encounters.length === 0 && plotLineList.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            아직 기록된 만남이 없어요.
          </p>
        ) : (
          <EncounterTimeline owner={owner} slug={slug} tracks={tracks} initialLanes={lanes} cards={cards} />
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {writable &&
          (characterList.length < 1 ? (
            <p className="text-sm text-muted-foreground">
              만남을 기록하려면 먼저{" "}
              <Link href={`/n/${owner}/${slug}/characters/new`} className="underline">
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
                <input type="hidden" name="order" value={encounters.length} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">제목</Label>
                  <Input id="title" name="title" required maxLength={150} placeholder="여우와의 첫 만남" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plotLineId">플롯라인</Label>
                  <select
                    id="plotLineId"
                    name="plotLineId"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    defaultValue=""
                  >
                    <option value="">미분류</option>
                    {plotLineList.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
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
                <Button type="submit" size="sm" className="self-start">
                  만남 추가
                </Button>
              </form>
            </details>
          ))}
      </div>
    </div>
  );
}
