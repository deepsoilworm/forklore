# Forklore

**English | [한국어](./README.md) | [日本語](./README.ja.md)**

An open-source platform for writing novels collaboratively, the way you collaborate on code: branches, commits, and pull requests.
The platform itself is open source (MIT) too — anyone can contribute or self-host it.

## Core concepts

- **A novel is a repository.** Each novel is its own git repository. Chapters are Markdown files under `chapters/*.md`.
- **Branches.** Keep the canonical story untouched while experimenting with alternate plots, translations, or endings on a branch.
- **Commits.** Every edit is recorded as a commit with author information.
- **Pull requests / merges.** Collaborators propose changes as PRs, which are reviewed and merged with a real 3-way git merge — conflicts surface to the user instead of being silently resolved.
- **Character sheets & an encounter timeline.** Each character has freely add/removable custom fields (age, species, home nation — whatever the story needs), plus the "encounters" where characters cross paths and a running log of how a character changes over time. This data is inherently relational, so it lives in Postgres rather than as git files — giving spreadsheet-style editing and character↔encounter cross-lookup.
- **AI writing assistance.** Continue a scene, get plot suggestions, or request a critique directly from the editor (via the Vercel AI Gateway).

## Architecture

- **Next.js App Router** (deployed on Vercel)
- **Postgres** (Drizzle ORM) — users, novel metadata, collaborator roles, a branch/commit cache, and pull requests
- **A real git engine** (`isomorphic-git`) — each novel's git history is handled by a pure-JS git implementation. The repository is packed into a single tar bundle stored in **Vercel Blob**, and every write is serialized with a Postgres advisory lock. See `src/lib/git/` for details.
- **Auth.js** — GitHub OAuth sign-in
- **Vercel AI Gateway** (`ai` SDK) — writing-assist features

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # fill in DATABASE_URL, AUTH_GITHUB_ID/SECRET, BLOB_READ_WRITE_TOKEN, etc.
pnpm drizzle-kit push               # apply the schema (or generate + migrate)
pnpm dev
```

When deploying to Vercel, provision Postgres and Blob storage via `/marketplace` (or the Vercel dashboard), then run `vercel link` and connect the environment variables.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) for details.
