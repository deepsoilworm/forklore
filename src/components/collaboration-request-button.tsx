import { auth } from "@/auth";
import { getCollaboratorRole, getMyCollaborationRequest } from "@/lib/queries";
import { requestCollaborationAction } from "@/lib/actions/collaborators";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { novels } from "@/db/schema";

export async function CollaborationRequestButton({
  owner,
  slug,
  novel,
}: {
  owner: string;
  slug: string;
  novel: typeof novels.$inferSelect;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (novel.ownerId === session.user.id) return null;

  const isCollaborator = (await getCollaboratorRole(novel.id, session.user.id)) !== null;
  if (isCollaborator) return null;

  const myRequest = await getMyCollaborationRequest(novel.id, session.user.id);

  if (myRequest?.status === "pending") {
    return (
      <Button type="button" variant="outline" disabled>
        협업 요청 대기 중
      </Button>
    );
  }

  return (
    <details className="inline-block">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg border px-2.5 text-sm font-medium hover:bg-accent/50">
        {myRequest?.status === "rejected" ? "다시 요청하기" : "협업 요청하기"}
      </summary>
      <form
        action={requestCollaborationAction}
        className="mt-2 flex w-80 flex-col gap-3 rounded-lg border bg-background p-3 shadow-md"
      >
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message" className="text-xs">
            메시지 (선택)
          </Label>
          <Textarea
            id="message"
            name="message"
            rows={2}
            maxLength={500}
            placeholder="이 이야기 정말 좋아해서 같이 써보고 싶어요"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="draftContent" className="text-xs">
            다음 화 미리 써보기 (선택)
          </Label>
          <Textarea
            id="draftContent"
            name="draftContent"
            rows={5}
            maxLength={20000}
            placeholder="다음 화를 이렇게 써보면 어떨까요? 짧게 맛보기로 써보세요."
          />
        </div>
        <Button type="submit" size="sm" className="self-start">
          요청 보내기
        </Button>
      </form>
    </details>
  );
}
