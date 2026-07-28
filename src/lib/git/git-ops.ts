import fs from "node:fs";
import path from "node:path";
import git from "isomorphic-git";

export type Author = { name: string; email: string };

export async function initRepo(dir: string, defaultBranch = "main") {
  await git.init({ fs, dir, defaultBranch });
}

export async function writeAndCommit(
  dir: string,
  opts: {
    branch: string;
    files: { filepath: string; content: string }[];
    deletions?: string[];
    message: string;
    author: Author;
  },
): Promise<string> {
  await git.checkout({ fs, dir, ref: opts.branch }).catch(async () => {
    // Branch doesn't exist yet (first commit on a fresh repo).
  });

  for (const file of opts.files) {
    const abs = path.join(dir, file.filepath);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, file.content, "utf8");
    await git.add({ fs, dir, filepath: file.filepath });
  }
  for (const filepath of opts.deletions ?? []) {
    await git.remove({ fs, dir, filepath });
  }

  const sha = await git.commit({
    fs,
    dir,
    ref: opts.branch,
    message: opts.message,
    author: opts.author,
  });

  // Ensure HEAD/refs point at this branch (matters for a brand-new repo).
  await git.writeRef({
    fs,
    dir,
    ref: `refs/heads/${opts.branch}`,
    value: sha,
    force: true,
  });

  return sha;
}

export async function listBranches(dir: string) {
  return git.listBranches({ fs, dir });
}

export async function createBranch(
  dir: string,
  opts: { name: string; from: string },
) {
  const oid = await git.resolveRef({ fs, dir, ref: opts.from });
  await git.branch({ fs, dir, ref: opts.name, object: oid });
}

export async function resolveRef(dir: string, ref: string) {
  return git.resolveRef({ fs, dir, ref });
}

export async function log(
  dir: string,
  opts: { ref: string; depth?: number },
) {
  return git.log({ fs, dir, ref: opts.ref, depth: opts.depth ?? 50 });
}

export async function readFileAtRef(
  dir: string,
  opts: { ref: string; filepath: string },
): Promise<string | null> {
  try {
    const oid = await git.resolveRef({ fs, dir, ref: opts.ref });
    const { blob } = await git.readBlob({
      fs,
      dir,
      oid,
      filepath: opts.filepath,
    });
    return Buffer.from(blob).toString("utf8");
  } catch {
    return null;
  }
}

export async function listFilesAtRef(dir: string, ref: string) {
  const oid = await git.resolveRef({ fs, dir, ref });
  return git.listFiles({ fs, dir, ref: oid });
}

export type MergeResult =
  | { status: "up-to-date" }
  | { status: "fast-forward"; oid: string }
  | { status: "merged"; oid: string }
  | { status: "conflict"; conflicts: string[] };

export async function mergeBranches(
  dir: string,
  opts: {
    theirs: string;
    ours: string;
    author: Author;
    message?: string;
  },
): Promise<MergeResult> {
  try {
    const result = await git.merge({
      fs,
      dir,
      ours: opts.ours,
      theirs: opts.theirs,
      author: opts.author,
      message:
        opts.message ?? `Merge branch '${opts.theirs}' into ${opts.ours}`,
      abortOnConflict: true,
    });

    if (result.alreadyMerged) return { status: "up-to-date" };
    if (!result.oid) return { status: "up-to-date" };

    // isomorphic-git updates the in-memory result but not necessarily the
    // ref/working tree for `ours` — make sure the branch ref points here.
    await git.writeRef({
      fs,
      dir,
      ref: `refs/heads/${opts.ours}`,
      value: result.oid,
      force: true,
    });
    await git.checkout({ fs, dir, ref: opts.ours, force: true });

    return {
      status: result.fastForward ? "fast-forward" : "merged",
      oid: result.oid,
    };
  } catch (err) {
    if (err instanceof git.Errors.MergeConflictError) {
      return { status: "conflict", conflicts: err.data.filepaths };
    }
    throw err;
  }
}
