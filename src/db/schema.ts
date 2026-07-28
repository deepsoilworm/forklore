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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.novelId, t.sha] }),
    index("commits_novel_branch_idx").on(t.novelId, t.branch),
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
