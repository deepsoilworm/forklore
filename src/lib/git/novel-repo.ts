import { db } from "@/db";
import { commits, novels, refs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withRepoLock } from "./repo-lock";
import {
  checkoutScratchDir,
  discardScratchDir,
  persistScratchDir,
} from "./repo-store";
import * as gitOps from "./git-ops";
import type { Author } from "./git-ops";

async function syncBranchCache(novelId: string, dir: string, branch: string) {
  const oid = await gitOps.resolveRef(dir, branch).catch(() => null);
  if (!oid) return;

  await db
    .insert(refs)
    .values({ novelId, name: branch, commitSha: oid })
    .onConflictDoUpdate({
      target: [refs.novelId, refs.name],
      set: { commitSha: oid, updatedAt: new Date() },
    });

  const history = await gitOps.log(dir, { ref: branch, depth: 50 });
  if (history.length === 0) return;

  await db
    .insert(commits)
    .values(
      history.map((c) => ({
        novelId,
        sha: c.oid,
        parentShas: c.commit.parent,
        branch,
        message: c.commit.message.trim(),
        createdAt: new Date(c.commit.author.timestamp * 1000),
      })),
    )
    .onConflictDoNothing();
}

export async function createNovel(opts: {
  ownerId: string;
  slug: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  author: Author;
}) {
  const [novel] = await db
    .insert(novels)
    .values({
      ownerId: opts.ownerId,
      slug: opts.slug,
      name: opts.name,
      description: opts.description,
      visibility: opts.visibility,
    })
    .returning();

  await withRepoLock(novel.id, async () => {
    const { dir } = await checkoutScratchDir(novel.id);
    try {
      await gitOps.initRepo(dir, "main");
      await gitOps.writeAndCommit(dir, {
        branch: "main",
        files: [
          {
            filepath: "README.md",
            content: `# ${opts.name}\n\n${opts.description ?? ""}\n`,
          },
        ],
        message: "Initial commit",
        author: opts.author,
      });
      await persistScratchDir(novel.id, dir);
      await syncBranchCache(novel.id, dir, "main");
    } finally {
      await discardScratchDir(dir);
    }
  });

  return novel;
}

export async function commitChapter(opts: {
  novelId: string;
  branch: string;
  filepath: string;
  content: string;
  message: string;
  author: Author;
}) {
  return withRepoLock(opts.novelId, async () => {
    const { dir } = await checkoutScratchDir(opts.novelId);
    try {
      const sha = await gitOps.writeAndCommit(dir, {
        branch: opts.branch,
        files: [{ filepath: opts.filepath, content: opts.content }],
        message: opts.message,
        author: opts.author,
      });
      await persistScratchDir(opts.novelId, dir);
      await syncBranchCache(opts.novelId, dir, opts.branch);
      await db
        .update(novels)
        .set({ updatedAt: new Date() })
        .where(eq(novels.id, opts.novelId));
      return sha;
    } finally {
      await discardScratchDir(dir);
    }
  });
}

export async function createBranch(opts: {
  novelId: string;
  name: string;
  from: string;
}) {
  return withRepoLock(opts.novelId, async () => {
    const { dir } = await checkoutScratchDir(opts.novelId);
    try {
      await gitOps.createBranch(dir, { name: opts.name, from: opts.from });
      await persistScratchDir(opts.novelId, dir);
      await syncBranchCache(opts.novelId, dir, opts.name);
    } finally {
      await discardScratchDir(dir);
    }
  });
}

export async function getChapterContent(opts: {
  novelId: string;
  ref: string;
  filepath: string;
}) {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    return await gitOps.readFileAtRef(dir, {
      ref: opts.ref,
      filepath: opts.filepath,
    });
  } finally {
    await discardScratchDir(dir);
  }
}

export async function listChapterFiles(opts: { novelId: string; ref: string }) {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    const files = await gitOps.listFilesAtRef(dir, opts.ref);
    return files.filter((f) => f.endsWith(".md"));
  } finally {
    await discardScratchDir(dir);
  }
}

export async function getHistory(opts: {
  novelId: string;
  ref: string;
  depth?: number;
}) {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    return await gitOps.log(dir, { ref: opts.ref, depth: opts.depth });
  } finally {
    await discardScratchDir(dir);
  }
}

export async function mergeBranches(opts: {
  novelId: string;
  source: string;
  target: string;
  author: Author;
  message?: string;
}) {
  return withRepoLock(opts.novelId, async () => {
    const { dir } = await checkoutScratchDir(opts.novelId);
    try {
      const result = await gitOps.mergeBranches(dir, {
        theirs: opts.source,
        ours: opts.target,
        author: opts.author,
        message: opts.message,
      });

      if (result.status === "merged" || result.status === "fast-forward") {
        await persistScratchDir(opts.novelId, dir);
        await syncBranchCache(opts.novelId, dir, opts.target);
        await db
          .update(novels)
          .set({ updatedAt: new Date() })
          .where(eq(novels.id, opts.novelId));
      }

      return result;
    } finally {
      await discardScratchDir(dir);
    }
  });
}

export async function listBranches(novelId: string) {
  return db.select().from(refs).where(eq(refs.novelId, novelId));
}

export async function getBranchCommits(novelId: string, branch: string) {
  return db
    .select()
    .from(commits)
    .where(and(eq(commits.novelId, novelId), eq(commits.branch, branch)))
    .orderBy(commits.createdAt);
}
