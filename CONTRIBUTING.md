# 기여 가이드

**[English](./CONTRIBUTING.en.md) | 한국어 | [日本語](./CONTRIBUTING.ja.md)**

Forklore는 오픈소스 프로젝트이며 기여를 환영합니다.

## 개발 환경

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

- 코드 스타일: ESLint (`pnpm lint`), TypeScript strict 모드 (`pnpm exec tsc --noEmit`)
- DB 스키마 변경: `src/db/schema.ts`를 수정한 뒤 `pnpm drizzle-kit generate`로 마이그레이션을 생성하세요.

## PR 절차

1. 이슈가 없다면 먼저 이슈를 열어 논의해주세요 (버그/기능 제안).
2. 브랜치를 만들어 작업하고, 커밋 메시지는 변경의 의도를 간결히 설명해주세요.
3. `pnpm lint`와 타입체크가 통과하는지 확인 후 PR을 올려주세요.
4. 작은 단위의 PR을 선호합니다.

## 프로젝트 구조

- `src/lib/git/` — 소설의 git 백엔드 (isomorphic-git 래퍼, Blob 저장/락, diff)
- `src/lib/actions/` — 서버 액션 (소설/챕터/브랜치/PR)
- `src/lib/queries.ts` — 읽기 전용 DB 쿼리
- `src/app/n/[owner]/[slug]/` — 소설 페이지 (코드/커밋/브랜치/PR 탭)
- `src/db/schema.ts` — Drizzle 스키마
