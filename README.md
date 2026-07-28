# Forklore

**[English](./README.en.md) | 한국어 | [日本語](./README.ja.md)**

Git처럼 브랜치, 커밋, 풀 리퀘스트로 협업하며 소설을 쓰는 오픈소스 플랫폼입니다.
플랫폼 자체도 오픈소스(MIT)이며, 누구나 코드에 기여하거나 셀프호스팅할 수 있습니다.

## 핵심 개념

- **소설 = 저장소(repository)**: 각 소설은 하나의 git 저장소입니다. 챕터는 `chapters/*.md` 형태의 Markdown 파일입니다.
- **브랜치**: 원작 그대로 두고 대안 전개, 번역, 다른 결말 등을 브랜치로 실험할 수 있습니다.
- **커밋**: 모든 수정은 저자 정보가 남는 커밋으로 기록됩니다.
- **풀 리퀘스트 / 머지**: 협업자가 만든 변경을 리뷰하고 병합합니다. 병합은 실제 3-way git merge로 처리되며, 충돌은 사용자에게 표시됩니다.
- **인물(캐릭터) 시트 & 만남 타임라인**: 인물마다 자유롭게 항목(나이, 종족, 소속 국가 등 무엇이든)을 추가/삭제할 수 있고, 인물들이 서로 얽히는 "만남"과 시점별 "변화"도 기록합니다. 이 데이터는 본질적으로 관계형이라 git 파일이 아니라 Postgres에 저장되어, 표 형태 편집과 인물↔만남 교차 조회를 지원합니다.
- **AI 집필 보조**: 에디터에서 이어쓰기 / 전개 제안 / 비평 받기를 즉시 사용할 수 있습니다 (Vercel AI Gateway 사용).

## 아키텍처

- **Next.js App Router** (Vercel 배포)
- **Postgres** (Drizzle ORM) — 사용자, 소설 메타데이터, 협업자 권한, 브랜치/커밋 캐시, 풀 리퀘스트를 저장
- **실제 Git 엔진** (`isomorphic-git`) — 각 소설의 git 히스토리는 순수 JS git 구현으로 다룹니다. 저장소는 하나의 tar 번들로 패키징되어 **Vercel Blob**에 저장되고, 쓰기 작업마다 Postgres advisory lock으로 동시성을 제어합니다. 자세한 내용은 `src/lib/git/` 참고.
- **Auth.js** — GitHub OAuth 로그인
- **Vercel AI Gateway** (`ai` SDK) — AI 집필 보조 기능

## 시작하기

```bash
pnpm install
cp .env.local.example .env.local   # DATABASE_URL, AUTH_GITHUB_ID/SECRET, BLOB_READ_WRITE_TOKEN 등 채우기
pnpm drizzle-kit push               # 스키마 반영 (또는 generate + migrate)
pnpm dev
```

Vercel에 배포할 때는 `/marketplace` (또는 Vercel 대시보드)에서 Postgres와 Blob 스토리지를 프로비저닝하고, `vercel link` 후 환경변수를 연결하세요.

## 라이선스

MIT — [LICENSE](./LICENSE) 참고.

## 기여하기

이슈와 PR을 환영합니다. 자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.
