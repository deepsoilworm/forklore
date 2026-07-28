# Forklore

**[English](./README.en.md) | [한국어](./README.md) | 日本語**

コードのように、ブランチ・コミット・プルリクエストで協力しながら小説を書くオープンソースプラットフォームです。
プラットフォーム自体もオープンソース(MIT)で、誰でもコードに貢献したりセルフホストしたりできます。

## 主な概念

- **小説 = リポジトリ**: それぞれの小説は1つのgitリポジトリです。章は `chapters/*.md` 形式のMarkdownファイルです。
- **ブランチ**: 原作はそのままに、代替の展開・翻訳・別エンディングなどをブランチで試すことができます。
- **コミット**: すべての変更は著者情報が残るコミットとして記録されます。
- **プルリクエスト / マージ**: 協力者による変更をレビューしてマージします。マージは実際の3-way git mergeで処理され、コンフリクトはユーザーに表示されます。
- **キャラクターシート**: `characters/*.md` に人物情報・関係性・設定を、章と同じようにバージョン管理されたMarkdownとして記録します。
- **AI執筆アシスト**: エディタから続きを書く / 展開の提案 / 講評をすぐに受けられます (Vercel AI Gatewayを使用)。

## アーキテクチャ

- **Next.js App Router** (Vercelにデプロイ)
- **Postgres** (Drizzle ORM) — ユーザー、小説のメタデータ、協力者の権限、ブランチ/コミットのキャッシュ、プルリクエストを保存
- **実際のGitエンジン** (`isomorphic-git`) — 各小説のgit履歴は純粋なJS実装のgitで扱います。リポジトリは1つのtarバンドルにまとめられ**Vercel Blob**に保存され、書き込みごとにPostgresのadvisory lockで排他制御されます。詳細は `src/lib/git/` を参照してください。
- **Auth.js** — GitHub OAuthログイン
- **Vercel AI Gateway** (`ai` SDK) — AI執筆アシスト機能

## はじめかた

```bash
pnpm install
cp .env.local.example .env.local   # DATABASE_URL, AUTH_GITHUB_ID/SECRET, BLOB_READ_WRITE_TOKEN などを設定
pnpm drizzle-kit push               # スキーマを反映 (または generate + migrate)
pnpm dev
```

Vercelにデプロイする際は `/marketplace` (またはVercelダッシュボード)でPostgresとBlobストレージをプロビジョニングし、`vercel link` の後に環境変数を接続してください。

## ライセンス

MIT — [LICENSE](./LICENSE) を参照。

## コントリビュート

Issue・PRを歓迎します。詳細は [CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md) を参照してください。
