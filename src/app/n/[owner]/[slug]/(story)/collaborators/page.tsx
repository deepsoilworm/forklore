import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getNovelByOwnerSlug,
  listCollaborators,
  listPendingCollaborationRequests,
} from "@/lib/queries";
import {
  inviteCollaboratorAction,
  removeCollaboratorAction,
  respondCollaborationRequestAction,
} from "@/lib/actions/collaborators";
import { ROLE_LABELS } from "@/lib/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function CollaboratorsPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (found.novel.ownerId !== session.user.id) {
    redirect(`/n/${owner}/${slug}`);
  }

  const [collaboratorList, pendingRequests] = await Promise.all([
    listCollaborators(found.novel.id),
    listPendingCollaborationRequests(found.novel.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            협업 요청 ({pendingRequests.length})
          </h2>
          <ul className="flex flex-col gap-1.5">
            {pendingRequests.map(({ request, user }) => (
              <li
                key={user.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">@{user.username}</span>
                  <div className="ml-auto flex gap-2">
                    <form action={respondCollaborationRequestAction}>
                      <input type="hidden" name="owner" value={owner} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="accept" value="true" />
                      <Button type="submit" size="xs">
                        수락
                      </Button>
                    </form>
                    <form action={respondCollaborationRequestAction}>
                      <input type="hidden" name="owner" value={owner} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="accept" value="false" />
                      <Button type="submit" variant="ghost" size="xs">
                        거절
                      </Button>
                    </form>
                  </div>
                </div>
                {request.message && (
                  <p className="pl-10 text-sm text-muted-foreground">{request.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">협업자</h2>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
          <Avatar className="h-7 w-7">
            <AvatarImage src={found.owner.image ?? undefined} />
            <AvatarFallback>{owner[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium">@{owner}</span>
          <Badge variant="secondary" className="ml-auto">
            {ROLE_LABELS.owner}
          </Badge>
        </div>
        {collaboratorList.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            아직 초대된 협업자가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {collaboratorList.map(({ collaborator, user }) => (
              <li
                key={user.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium">@{user.username}</span>
                <Badge variant="secondary" className="ml-auto">
                  {ROLE_LABELS[collaborator.role]}
                </Badge>
                <form action={removeCollaboratorAction}>
                  <input type="hidden" name="owner" value={owner} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="ghost" size="xs">
                    제거
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={inviteCollaboratorAction} className="flex flex-col gap-3 rounded-lg border px-4 py-3">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <h3 className="text-sm font-medium">협업자 초대</h3>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="username">유저네임</Label>
            <Input id="username" name="username" required placeholder="wgyuh" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">권한</Label>
            <select
              id="role"
              name="role"
              defaultValue="writer"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="writer">{ROLE_LABELS.writer}</option>
              <option value="maintainer">{ROLE_LABELS.maintainer}</option>
              <option value="reader">{ROLE_LABELS.reader}</option>
            </select>
          </div>
        </div>
        <Button type="submit" size="sm" className="self-start">
          초대
        </Button>
      </form>
    </div>
  );
}
