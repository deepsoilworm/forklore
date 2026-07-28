# コントリビューションガイド

**[English](./CONTRIBUTING.en.md) | [한국어](./CONTRIBUTING.md) | 日本語**

Forkloreはオープンソースプロジェクトであり、コントリビューションを歓迎します。

## 開発環境

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

- コードスタイル: ESLint (`pnpm lint`)、TypeScript strictモード (`pnpm exec tsc --noEmit`)
- DBスキーマ変更: `src/db/schema.ts` を編集した後、`pnpm drizzle-kit generate` でマイグレーションを生成してください。

## PRの流れ

1. Issueがまだなければ、まずIssueを立てて議論してください(バグ報告・機能提案)。
2. ブランチを作成して作業し、変更の意図が伝わるコミットメッセージを書いてください。
3. `pnpm lint` と型チェックが通ることを確認してからPRを作成してください。
4. 小さく焦点を絞ったPRを歓迎します。

## プロジェクト構成

- `src/lib/git/` — 小説のgitバックエンド (isomorphic-gitラッパー、Blobストレージ/ロック、diff)
- `src/lib/actions/` — サーバーアクション (小説/章/ブランチ/PR)
- `src/lib/queries.ts` — 読み取り専用のDBクエリ
- `src/app/n/[owner]/[slug]/` — 小説ページ (コード/コミット/ブランチ/キャラクター/PRタブ)
- `src/db/schema.ts` — Drizzleスキーマ
