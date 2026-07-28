import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createNovelAction } from "@/lib/actions/novels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewNovelPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>새 소설 만들기</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createNovelAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">제목</Label>
              <Input id="name" name="name" required maxLength={100} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">주소 (slug)</Label>
              <Input
                id="slug"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="my-novel"
              />
              <p className="text-xs text-muted-foreground">
                /n/{session.user.username}/<b>slug</b> 형태로 소설 주소가
                만들어져요. 소문자, 숫자, 하이픈만 사용하세요.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">소개</Label>
              <Textarea id="description" name="description" maxLength={500} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="visibility">공개 범위</Label>
              <select
                id="visibility"
                name="visibility"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                defaultValue="public"
              >
                <option value="public">공개</option>
                <option value="private">비공개</option>
              </select>
            </div>
            <Button type="submit">만들기</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
