import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPO_URL = "https://github.com/deepsoilworm/forklore";

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Forklore는 오픈소스입니다</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          이 플랫폼(코드 전체)이 MIT 라이선스로 공개되어 있어요. 누구나 코드를 읽고,
          고치고, 셀프호스팅하고, 기여할 수 있습니다. 이야기 하나하나가 git 저장소인
          것처럼, Forklore 자체도 하나의 오픈소스 프로젝트예요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<a href={REPO_URL} target="_blank" rel="noopener noreferrer" />}>
            GitHub에서 보기
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" />}
          >
            기여 가이드
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" />}
          >
            LICENSE (MIT)
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">어떻게 만들어졌나요</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm leading-7 text-muted-foreground">
          <p>
            각 이야기는 실제 git 저장소예요 (isomorphic-git으로 구현). 브랜치, 커밋,
            풀 리퀘스트, 3-way 머지가 그대로 동작합니다.
          </p>
          <p>
            인물·만남처럼 본질적으로 관계형인 데이터는 git 파일 대신 Postgres에
            저장해서 표 편집, 드래그앤드롭 타임라인 같은 더 나은 경험을 우선했어요.
          </p>
          <p>Next.js, Postgres(Drizzle), Vercel Blob, Auth.js로 만들어졌습니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">셀프호스팅</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          저장소를 clone해서 <code>pnpm install</code> 후 Postgres와 Blob 스토리지만
          연결하면 바로 띄울 수 있어요. 자세한 내용은 README를 참고하세요.
        </CardContent>
      </Card>
    </div>
  );
}
