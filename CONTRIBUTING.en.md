# Contributing

**English | [한국어](./CONTRIBUTING.md) | [日本語](./CONTRIBUTING.ja.md)**

Forklore is open source and contributions are welcome.

## Development setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

- Code style: ESLint (`pnpm lint`), TypeScript strict mode (`pnpm exec tsc --noEmit`)
- Schema changes: edit `src/db/schema.ts`, then run `pnpm drizzle-kit generate` to produce a migration.

## PR process

1. If there isn't an issue for it yet, please open one first to discuss (bug reports / feature proposals).
2. Work on a branch; write commit messages that explain the intent of the change.
3. Make sure `pnpm lint` and the typecheck pass before opening a PR.
4. Small, focused PRs are preferred.

## Project layout

- `src/lib/git/` — the novel's git backend (isomorphic-git wrapper, Blob storage/locking, diff)
- `src/lib/actions/` — server actions (novels/chapters/branches/PRs)
- `src/lib/queries.ts` — read-only DB queries
- `src/app/n/[owner]/[slug]/` — novel pages (code/commits/branches/characters/PR tabs)
- `src/db/schema.ts` — Drizzle schema
