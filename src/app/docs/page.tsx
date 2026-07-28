import Link from "next/link";

const SECTIONS = [
  {
    id: "start",
    title: "시작하기",
    body: (
      <>
        <p>
          GitHub로 로그인하면 유저네임이 자동으로 만들어져요. 헤더의{" "}
          <b>새 이야기</b>를 눌러 제목, 주소(slug), 장르, 언어, 공개 범위를
          정하면 이야기가 하나 만들어집니다 — 동시에 그 이야기 전용 git
          저장소도 함께 생성돼요.
        </p>
        <p>주소는 항상 이런 형태예요: /n/유저네임/slug</p>
      </>
    ),
  },
  {
    id: "read",
    title: "읽기",
    body: (
      <>
        <p>
          이야기 페이지의 <b>읽기</b> 탭이 기본 화면이에요. 회차는{" "}
          <code>chapters/*.md</code> 파일을 파일명 순서로 자동 정렬해서 1화,
          2화… 로 보여주고, 각 파일의 첫 <code>#</code> 제목을 회차 제목으로
          씁니다.
        </p>
        <p>
          회차를 하나씩 읽거나, <b>전체 보기</b>로 모든 회차를 이어서 읽을 수
          있어요. 공개 이야기는 로그인 없이 누구나 읽을 수 있고, 비공개
          이야기는 작성자·협업자만 볼 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "write",
    title: "쓰기 · 브랜치 · 풀 리퀘스트",
    body: (
      <>
        <p>
          <b>코드</b> 탭이 실제 git 저장소 뷰예요. 챕터 파일 목록, 브랜치
          전환, 저장소 주소 복사가 여기 있습니다. 쓰기 권한이 있으면 「새 회차
          쓰기」로 마크다운 에디터가 열리고, 커밋 메시지와 함께 저장하면 실제
          git 커밋이 생겨요.
        </p>
        <p>
          <b>브랜치</b>로 원작을 건드리지 않고 대안 전개나 번역을 실험할 수
          있고, <b>풀 리퀘스트</b>로 브랜치 간 변경을 리뷰하고 실제 3-way
          머지로 병합합니다. 충돌이 나면 화면에 표시돼요.
        </p>
      </>
    ),
  },
  {
    id: "characters",
    title: "인물",
    body: (
      <>
        <p>
          인물마다 이름 + 자유 항목(나이, 종족, 소속 국가 등 뭐든)을
          추가/삭제하며 시트를 만들 수 있어요. 목록은 이야기에 쓰인 모든
          항목명을 열로 모은 표로 보여줍니다.
        </p>
        <p>
          인물 상세 페이지의 <b>변화 타임라인</b>에는 「3화 — 성격 냉소적으로
          변화」 처럼 이야기 진행에 따른 변화를 기록할 수 있어요. 필드값
          자체는 항상 「현재 기준」 상태를 유지합니다.
        </p>
      </>
    ),
  },
  {
    id: "encounters",
    title: "만남 (타임라인)",
    body: (
      <>
        <p>
          <b>만남</b> 탭은 인물들이 서로 얽히는 사건을 플롯라인(트랙)별로
          정리하는 타임라인이에요. 동영상 편집기처럼 카드를 마우스로 끌어서
          좌우로 옮기면 순서가 바뀌고, 다른 트랙으로 끌면 그 플롯라인에
          옮겨집니다.
        </p>
        <p>
          플롯라인이 없는 만남은 「미분류」 트랙에 남아요. 인물 상세
          페이지에서도 그 인물이 등장한 만남 목록을 볼 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "engagement",
    title: "댓글 · 투표",
    body: (
      <>
        <p>
          각 회차 하단에서 로그인한 사용자는 댓글을 남길 수 있어요. 작성자는
          회차마다 「다음 전개 투표」를 하나씩 만들 수 있고 (2~4개 선택지),
          독자는 한 번 투표할 수 있습니다 — 투표하면 막대그래프로 결과가
          보여요.
        </p>
      </>
    ),
  },
  {
    id: "data-model",
    title: "저장 방식이 궁금하다면",
    body: (
      <>
        <p>
          챕터 본문(프로즈)은 실제 git 커밋으로, 인물·만남·플롯라인·댓글·투표처럼
          본질적으로 관계형인 데이터는 Postgres 테이블로 저장돼요. 전자는
          브랜치/머지 같은 협업 워크플로가 핵심이라 git이 맞고, 후자는 표
          편집이나 드래그앤드롭 같은 UX가 더 중요해서 DB를 택했습니다.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-3xl gap-10 px-4 py-10">
      <nav className="sticky top-10 hidden h-fit w-40 shrink-0 flex-col gap-1 text-sm sm:flex">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
            {s.title}
          </a>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">사용 가이드</h1>
          <p className="text-sm text-muted-foreground">
            Forklore의 기능을 짧게 정리했어요. 플랫폼 자체에 대한 소개는{" "}
            <Link href="/about" className="underline">
              오픈소스 페이지
            </Link>
            를 참고하세요.
          </p>
        </header>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-10 flex-col gap-3">
            <h2 className="text-lg font-medium">{s.title}</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-muted-foreground">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
