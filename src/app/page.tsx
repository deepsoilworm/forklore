import Link from "next/link";
import { auth } from "@/auth";
import { listPublicNovels } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function Home() {
  const [session, novels] = await Promise.all([auth(), listPublicNovels()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-10 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          함께 쓰는, 오픈소스 소설 플랫폼
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          브랜치를 만들고, 챕터를 커밋하고, 풀 리퀘스트로 병합하세요.
          Forklore는 Git의 협업 모델을 소설 창작에 그대로 적용한 오픈소스
          프로젝트입니다.
        </p>
        <div className="flex gap-3">
          <Button
            render={
              <Link href={session?.user ? "/new" : "/api/auth/signin"} />
            }
          >
            {session?.user ? "새 소설 시작하기" : "GitHub로 시작하기"}
          </Button>
          <Button
            variant="outline"
            render={
              <a
                href="https://github.com/deepsoilworm/forklore"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            GitHub에서 보기
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">공개된 소설</h2>
        {novels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 공개된 소설이 없어요. 첫 번째 소설을 만들어보세요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {novels.map(({ novel, owner }) => (
              <Link key={novel.id} href={`/n/${owner.username}/${novel.slug}`}>
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{novel.name}</span>
                      <Badge variant="secondary">
                        {formatDistanceToNow(novel.updatedAt, {
                          addSuffix: true,
                        })}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {novel.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      @{owner.username}
                    </p>
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
