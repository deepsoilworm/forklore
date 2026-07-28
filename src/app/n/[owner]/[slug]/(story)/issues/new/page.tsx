import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug } from "@/lib/queries";
import { createIssueAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function NewIssuePage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canRead(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h2 className="mb-4 text-lg font-medium">새 이슈</h2>
      <form action={createIssueAction} className="flex flex-col gap-4">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" required maxLength={150} placeholder="3화 오탈자 제보" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="body">내용</Label>
          <Textarea id="body" name="body" maxLength={5000} rows={8} />
        </div>
        <Button type="submit" className="self-start">
          이슈 만들기
        </Button>
      </form>
    </div>
  );
}
