import { db } from "@/db";
import { categoryEnum, commits, languageEnum, novels, refs } from "@/db/schema";
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
  category: (typeof categoryEnum.enumValues)[number];
  language: (typeof languageEnum.enumValues)[number];
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
      category: opts.category,
      language: opts.language,
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

export async function listMarkdownFiles(opts: {
  novelId: string;
  ref: string;
  prefix?: string;
}) {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    const files = await gitOps.listFilesAtRef(dir, opts.ref);
    return files
      .filter((f) => f.endsWith(".md"))
      .filter((f) => !opts.prefix || f.startsWith(opts.prefix));
  } finally {
    await discardScratchDir(dir);
  }
}

export type Episode = {
  path: string;
  file: string;
  index: number;
  title: string;
  content: string;
};

export async function listEpisodes(opts: {
  novelId: string;
  ref: string;
  prefix?: string;
}): Promise<Episode[]> {
  const prefix = opts.prefix ?? "chapters/";
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    const files = (await gitOps.listFilesAtRef(dir, opts.ref))
      .filter((f) => f.endsWith(".md") && f.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return await Promise.all(
      files.map(async (path, i) => {
        const content =
          (await gitOps.readFileAtRef(dir, { ref: opts.ref, filepath: path })) ?? "";
        const file = path.slice(prefix.length);
        const heading = content.match(/^#\s+(.+)$/m);
        return {
          path,
          file,
          index: i + 1,
          title: heading ? heading[1].trim() : file.replace(/\.md$/, ""),
          content,
        };
      }),
    );
  } finally {
    await discardScratchDir(dir);
  }
}

export type MarkdownEntry = { path: string; file: string; content: string };

// Generic "list every .md file under a prefix, with its content" — used for
// any file-per-item collection (characters/, and future setting types like
// locations/ or lore/ would reuse this the same way).
export async function listMarkdownEntries(opts: {
  novelId: string;
  ref: string;
  prefix: string;
}): Promise<MarkdownEntry[]> {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    const files = (await gitOps.listFilesAtRef(dir, opts.ref))
      .filter((f) => f.endsWith(".md") && f.startsWith(opts.prefix))
      .sort((a, b) => a.localeCompare(b));

    return await Promise.all(
      files.map(async (path) => ({
        path,
        file: path.slice(opts.prefix.length),
        content:
          (await gitOps.readFileAtRef(dir, { ref: opts.ref, filepath: path })) ?? "",
      })),
    );
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
