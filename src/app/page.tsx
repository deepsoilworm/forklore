import Link from "next/link";
import { auth } from "@/auth";
import { listPublicNovels } from "@/lib/queries";
import { categoryEnum } from "@/db/schema";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoverThumbnail } from "@/components/cover-thumbnail";
import { formatDistanceToNow } from "date-fns";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const validCategory = categoryEnum.enumValues.find((c) => c === category);

  const [session, novels] = await Promise.all([
    auth(),
    listPublicNovels({ category: validCategory }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-10 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          함께 쓰는, 오픈소스 이야기 플랫폼
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          브랜치를 만들고, 챕터를 커밋하고, 풀 리퀘스트로 병합하세요.
          Forklore는 Git의 협업 모델을 이야기 창작에 그대로 적용한 오픈소스
          프로젝트입니다.
        </p>
        <div className="flex gap-3">
          <Button
            nativeButton={false}
            render={
              <Link href={session?.user ? "/new" : "/api/auth/signin"} />
            }
          >
            {session?.user ? "새 이야기 시작하기" : "GitHub로 시작하기"}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/about" />}>
            오픈소스 프로젝트예요
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">공개된 이야기</h2>
          <div className="flex flex-wrap gap-1.5">
            <Link href="/">
              <Badge variant={!validCategory ? "default" : "outline"}>전체</Badge>
            </Link>
            {categoryEnum.enumValues.map((value) => (
              <Link key={value} href={`/?category=${value}`}>
                <Badge variant={validCategory === value ? "default" : "outline"}>
                  {CATEGORY_LABELS[value]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
        {novels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 공개된 이야기가 없어요. 첫 번째 이야기를 만들어보세요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {novels.map(({ novel, owner }) => (
              <Link key={novel.id} href={`/n/${owner.username}/${novel.slug}/read`}>
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardContent className="flex gap-3">
                    <CoverThumbnail name={novel.name} size="small" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{novel.name}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {formatDistanceToNow(novel.updatedAt, { addSuffix: true })}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {novel.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground">@{owner.username}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline">{CATEGORY_LABELS[novel.category]}</Badge>
                          <Badge variant="outline">{LANGUAGE_LABELS[novel.language]}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
