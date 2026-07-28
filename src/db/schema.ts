import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const planEnum = pgEnum("plan", ["free", "pro"]);
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const roleEnum = pgEnum("collaborator_role", [
  "owner",
  "maintainer",
  "writer",
  "reader",
]);
export const prStatusEnum = pgEnum("pr_status", ["open", "merged", "closed"]);
export const categoryEnum = pgEnum("category", [
  "fantasy",
  "romance",
  "wuxia",
  "sf",
  "mystery",
  "drama",
  "horror",
  "bl",
  "historical",
  "other",
]);
export const languageEnum = pgEnum("language", ["ko", "en", "ja", "other"]);
export const storyStatusEnum = pgEnum("story_status", [
  "ongoing",
  "completed",
  "hiatus",
]);
export const changeRequestStatusEnum = pgEnum("change_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Nullable: OAuth sign-up creates the row before a username is chosen;
  // it's backfilled by the createUser auth event right after.
  username: text("username").unique(),
  bio: text("bio"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// A "novel" is a git repository: one bare repo, packed and stored in blob
// storage, with metadata + a denormalized cache of refs/commits here in
// Postgres so listing/browsing doesn't require unpacking git on every read.
export const novels = pgTable(
  "novels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    category: categoryEnum("category").notNull().default("other"),
    language: languageEnum("language").notNull().default("ko"),
    status: storyStatusEnum("status").notNull().default("ongoing"),
    defaultBranch: text("default_branch").notNull().default("main"),
    // Pointer to the packed git bundle in Vercel Blob storage.
    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    forkedFromId: uuid("forked_from_id"),
    starCount: integer("star_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("novels_owner_idx").on(t.ownerId)],
);

export const collaborators = pgTable(
  "collaborators",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("writer"),
    invitedAt: timestamp("invited_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.novelId, t.userId] })],
);

export const collaborationRequestStatusEnum = pgEnum("collaboration_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

// A reader asking to become a collaborator, the other direction from an
// owner-initiated invite. One row per (novel, user) — re-requesting after a
// rejection just flips the same row back to "pending".
export const collaborationRequests = pgTable(
  "collaboration_requests",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message"),
    // An optional writing sample — "what I'd write for the next chapter" —
    // so the owner can judge fit/voice before granting write access at all.
    draftContent: text("draft_content"),
    status: collaborationRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    respondedAt: timestamp("responded_at"),
  },
  (t) => [primaryKey({ columns: [t.novelId, t.userId] })],
);

// Denormalized ref cache (branches). Source of truth is the packed repo;
// this exists purely so the UI can list branches without a blob fetch.
export const refs = pgTable(
  "refs",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    commitSha: text("commit_sha").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.novelId, t.name] }),
    index("refs_novel_idx").on(t.novelId),
  ],
);

// Denormalized commit log cache for fast history views.
export const commits = pgTable(
  "commits",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    sha: text("sha").notNull(),
    parentShas: text("parent_shas").array().notNull().default([]),
    branch: text("branch").notNull(),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull(),
    // Populated only for commits made through the editor (not backfilled
    // for history synced from git log) — whitespace-stripped char count
    // of the file after this commit, and the change vs. its previous
    // version. Powers the writing-stats view.
    charCount: integer("char_count"),
    charDelta: integer("char_delta"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.novelId, t.sha] }),
    index("commits_novel_branch_idx").on(t.novelId, t.branch),
    index("commits_author_idx").on(t.authorId, t.createdAt),
  ],
);

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sourceBranch: text("source_branch").notNull(),
    targetBranch: text("target_branch").notNull(),
    status: prStatusEnum("status").notNull().default("open"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mergeCommitSha: text("merge_commit_sha"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    mergedAt: timestamp("merged_at"),
    closedAt: timestamp("closed_at"),
  },
  (t) => [
    uniqueIndex("pr_novel_number_idx").on(t.novelId, t.number),
    index("pr_novel_status_idx").on(t.novelId, t.status),
  ],
);

export const prComments = pgTable("pr_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  pullRequestId: uuid("pull_request_id")
    .notNull()
    .references(() => pullRequests.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  path: text("path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const issueStatusEnum = pgEnum("issue_status", ["open", "closed"]);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    status: issueStatusEnum("status").notNull().default("open"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
  },
  (t) => [
    uniqueIndex("issue_novel_number_idx").on(t.novelId, t.number),
    index("issue_novel_status_idx").on(t.novelId, t.status),
  ],
);

export const issueComments = pgTable("issue_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stars = pgTable(
  "stars",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.novelId, t.userId] })],
);

// One row per (user, novel) — upserted on every story-page visit so the
// sidebar's "최근 항목" can show a recency-ordered list without a full
// per-page-view log.
export const novelVisits = pgTable(
  "novel_visits",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.novelId, t.userId] }),
    index("novel_visits_user_idx").on(t.userId, t.visitedAt),
  ],
);

// Reader comments on a specific episode. Keyed by file path rather than a
// git blob/commit sha, so comments stay attached to "chapter 3" across
// edits — if the file is renamed they're orphaned, which is an acceptable
// MVP tradeoff since chapter paths rarely change once published.
// Character sheets and the encounters between them live in Postgres rather
// than as git files. Unlike prose, this is inherently relational data (an
// encounter references N characters) — modeling it as real foreign keys
// gives a much better editing/browsing experience than parsing markdown,
// at the cost of not being branch/commit-versioned like the story text.
export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("characters_novel_idx").on(t.novelId)],
);

// Freeform attributes ("나이", "종족", "소속 국가", ...) instead of fixed
// columns — not every story needs the same fields, and forcing e.g. fantasy
// races or political affiliations into a generic "personality" column
// doesn't fit. Each character has its own open-ended label/value list.
export const characterFields = pgTable(
  "character_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("character_fields_character_idx").on(t.characterId, t.order)],
);

// A snapshot of a character sheet taken right before it's overwritten —
// several people can edit the same character, so "what did this look
// like before that edit" needs to be recoverable without relying on git
// (this data never lived in git files to begin with).
export const characterRevisions = pgTable(
  "character_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    fields: jsonb("fields").notNull().default([]),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("character_revisions_character_idx").on(t.characterId, t.createdAt)],
);

// A proposed edit to a character sheet, mirroring the branch → pull
// request → merge flow chapters already have. The owner can still edit
// directly (equivalent to pushing straight to main); anyone else's edit
// lands here as "pending" until the owner approves it, instead of
// overwriting the sheet immediately.
export const characterChangeRequests = pgTable(
  "character_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    fields: jsonb("fields").notNull().default([]),
    status: changeRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("character_change_requests_character_idx").on(t.characterId, t.status)],
);

// A "track" in the encounter timeline — a plot thread (main plot, a
// subplot, a character's side arc, ...). Encounters unassigned to any
// plot line just render in a catch-all "미분류" row.
export const plotLines = pgTable(
  "plot_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("plot_lines_novel_idx").on(t.novelId, t.order)],
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    plotLineId: uuid("plot_line_id").references(() => plotLines.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("encounters_novel_idx").on(t.novelId, t.order),
    index("encounters_plot_line_idx").on(t.plotLineId, t.order),
  ],
);

export const encounterParticipants = pgTable(
  "encounter_participants",
  {
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.encounterId, t.characterId] }),
    index("encounter_participants_character_idx").on(t.characterId),
  ],
);

// A lightweight timeline of how a character changes over the course of the
// story — not a full versioned snapshot of every field, just a running log
// like "3화 — 여우 정체 발각, 성격 냉소적으로 변화". The character row itself
// stays the single current/reference sheet.
export const characterDevelopments = pgTable(
  "character_developments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    note: text("note").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("character_developments_character_idx").on(t.characterId, t.order)],
);

export const episodeComments = pgTable(
  "episode_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    episodePath: text("episode_path").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("episode_comments_lookup_idx").on(t.novelId, t.episodePath)],
);

// Author-created "what happens next" polls attached to an episode. One poll
// per episode for MVP simplicity.
export const polls = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    episodePath: text("episode_path").notNull(),
    question: text("question").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("polls_episode_idx").on(t.novelId, t.episodePath)],
);

export const pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("poll_options_poll_idx").on(t.pollId)],
);

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })],
);

// Freeform reference material (worldbuilding notes, sources, etc.) kept
// separate from characters/encounters — those are structured records,
// this is just open-ended notes an author jots down while writing.
export const researchNotes = pgTable(
  "research_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("research_notes_novel_idx").on(t.novelId, t.order)],
);

// A snapshot of a note taken right before it's overwritten — same
// reasoning as character_revisions above.
export const researchNoteRevisions = pgTable(
  "research_note_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => researchNotes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("research_note_revisions_note_idx").on(t.noteId, t.createdAt)],
);

// A proposed edit to a note — same request/approve flow as
// character_change_requests, for the same reason.
export const noteChangeRequests = pgTable(
  "note_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => researchNotes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    status: changeRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("note_change_requests_note_idx").on(t.noteId, t.status)],
);

// AI writing-assist usage, tracked per call so a future paid tier can meter it.
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  novelId: uuid("novel_id").references(() => novels.id, {
    onDelete: "set null",
  }),
  kind: text("kind").notNull(), // "continue" | "suggest" | "critique"
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
