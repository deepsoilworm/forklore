import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import {
  getCharacter,
  listCharacterDevelopments,
  listCharacterRevisions,
  listEncountersForCharacter,
  listPendingCharacterChangeRequests,
} from "@/lib/character-queries";
import {
  addCharacterDevelopmentAction,
  approveCharacterChangeRequestAction,
  rejectCharacterChangeRequestAction,
  restoreCharacterRevisionAction,
} from "@/lib/actions/characters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

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

  const [session, encounters, developments, revisions, pendingRequests] = await Promise.all([
    auth(),
    listEncountersForCharacter(character.id),
    listCharacterDevelopments(character.id),
    listCharacterRevisions(character.id),
    listPendingCharacterChangeRequests(character.id),
  ]);
  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const isOwner = session?.user?.id === found.novel.ownerId;
  const base = `/n/${owner}/${slug}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
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
        {character.fields.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {character.fields.map((f) => (
              <div key={f.id}>
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="mt-0.5">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {character.description && (
          <p className="whitespace-pre-wrap border-t pt-4 text-sm leading-7">
            {character.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-6">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          변화 타임라인 — 위 필드는 현재/기준 상태, 아래는 이야기 진행에 따른 변화 기록
        </h2>
        {developments.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            아직 기록된 변화가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {developments.map((dev) => (
              <li key={dev.id} className="flex gap-3 rounded-lg border px-3 py-2.5 text-sm">
                <span className="shrink-0 font-medium text-muted-foreground">{dev.label}</span>
                <span>{dev.note}</span>
              </li>
            ))}
          </ul>
        )}

        {writable && (
          <details className="mt-1 rounded-lg border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              변화 기록하기
            </summary>
            <form
              action={addCharacterDevelopmentAction}
              className="mt-3 flex flex-col gap-3"
            >
              <input type="hidden" name="owner" value={owner} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="characterId" value={character.id} />
              <div className="flex gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="label">시점</Label>
                  <Input id="label" name="label" required maxLength={50} placeholder="3화" className="w-24" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="note">변화 내용</Label>
                  <Input
                    id="note"
                    name="note"
                    required
                    maxLength={500}
                    placeholder="여우 정체 발각, 성격 냉소적으로 변화"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="self-start">
                추가
              </Button>
            </form>
          </details>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-6">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            변경 요청 대기 중 ({pendingRequests.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingRequests.map(({ request, author }) => (
              <li key={request.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {author.username} · {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                  </span>
                  {isOwner && (
                    <div className="flex gap-2">
                      <form action={rejectCharacterChangeRequestAction}>
                        <input type="hidden" name="owner" value={owner} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="characterId" value={character.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button type="submit" variant="outline" size="sm">
                          거절
                        </Button>
                      </form>
                      <form action={approveCharacterChangeRequestAction}>
                        <input type="hidden" name="owner" value={owner} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="characterId" value={character.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button type="submit" size="sm">
                          승인
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
                <p className="font-medium">{request.name}</p>
                {request.description && (
                  <p className="whitespace-pre-wrap text-muted-foreground">{request.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revisions.length > 0 && (
        <details className="border-t pt-6">
          <summary className="cursor-pointer px-1 text-sm font-medium text-muted-foreground">
            버전 기록 ({revisions.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {revisions.map(({ revision, author }) => (
              <li
                key={revision.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {author?.username ?? "알 수 없음"} ·{" "}
                  {formatDistanceToNow(revision.createdAt, { addSuffix: true })} · {revision.name}
                </span>
                {writable && (
                  <form action={restoreCharacterRevisionAction}>
                    <input type="hidden" name="owner" value={owner} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="characterId" value={character.id} />
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <Button type="submit" variant="outline" size="sm">
                      이 버전으로 복원
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

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
