import { auth } from "@/auth";
import { canWrite, getEpisodePoll, getNovelByOwnerSlug } from "@/lib/queries";
import { createPollAction, votePollAction } from "@/lib/actions/engagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export async function EpisodePoll({
  owner,
  slug,
  novelId,
  episodePath,
}: {
  owner: string;
  slug: string;
  novelId: string;
  episodePath: string;
}) {
  const session = await auth();
  const [found, poll] = await Promise.all([
    getNovelByOwnerSlug(owner, slug),
    getEpisodePoll(novelId, episodePath, session?.user?.id ?? null),
  ]);
  if (!found) return null;

  const writable = session?.user?.id ? await canWrite(found.novel, session.user.id) : false;

  if (!poll) {
    if (!writable) return null;
    return (
      <details className="rounded-lg border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          다음 전개 투표 만들기
        </summary>
        <form action={createPollAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="episodePath" value={episodePath} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="question">질문</Label>
            <Input
              id="question"
              name="question"
              required
              maxLength={200}
              placeholder="다음 화에서 주인공은 어떻게 할까요?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>선택지 (2~4개)</Label>
            {[0, 1, 2, 3].map((i) => (
              <Input
                key={i}
                name="options"
                maxLength={80}
                required={i < 2}
                placeholder={`선택지 ${i + 1}${i < 2 ? "" : " (선택)"}`}
              />
            ))}
          </div>
          <Button type="submit" size="sm" className="self-start">
            투표 만들기
          </Button>
        </form>
      </details>
    );
  }

  const hasVoted = poll.myOptionId !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border px-4 py-3">
      <p className="text-sm font-medium">{poll.poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map(({ option, votes }) => {
          const pct = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
          const isMine = poll.myOptionId === option.id;

          if (hasVoted || !session?.user) {
            return (
              <div key={option.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={isMine ? "font-medium" : ""}>
                    {option.label}
                    {isMine && " ✓"}
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <form key={option.id} action={votePollAction}>
              <input type="hidden" name="owner" value={owner} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="pollId" value={poll.poll.id} />
              <input type="hidden" name="optionId" value={option.id} />
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-1.5 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent/50"
              >
                {option.label}
              </button>
            </form>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes.toLocaleString()}명 참여
        {!session?.user && " · 로그인하면 투표할 수 있어요"}
      </p>
    </div>
  );
}
