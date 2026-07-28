import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getNovelByOwnerSlug } from "@/lib/queries";
import { listBranches } from "@/lib/git/novel-repo";
import { createPullRequestAction } from "@/lib/actions/pulls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function NewPullRequestPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const branches = await listBranches(found.novel.id);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h2 className="mb-4 text-lg font-medium">새 풀 리퀘스트</h2>
      <form action={createPullRequestAction} className="flex flex-col gap-4">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="sourceBranch">비교할 브랜치 (source)</Label>
            <select
              id="sourceBranch"
              name="sourceBranch"
              required
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="targetBranch">병합될 브랜치 (target)</Label>
            <select
              id="targetBranch"
              name="targetBranch"
              required
              defaultValue={found.novel.defaultBranch}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" required maxLength={150} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">설명</Label>
          <Textarea id="description" name="description" maxLength={2000} rows={6} />
        </div>
        <Button type="submit" className="self-start">
          풀 리퀘스트 만들기
        </Button>
      </form>
    </div>
  );
}
