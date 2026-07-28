import { diffLines, type Change } from "diff";
import * as gitOps from "./git-ops";
import { checkoutScratchDir, discardScratchDir } from "./repo-store";

export type FileDiff = {
  path: string;
  status: "added" | "removed" | "modified";
  changes: Change[];
};

export async function diffBranches(opts: {
  novelId: string;
  source: string;
  target: string;
}): Promise<FileDiff[]> {
  const { dir } = await checkoutScratchDir(opts.novelId);
  try {
    const [sourceFiles, targetFiles] = await Promise.all([
      gitOps.listFilesAtRef(dir, opts.source),
      gitOps.listFilesAtRef(dir, opts.target),
    ]);

    const paths = Array.from(
      new Set([...sourceFiles, ...targetFiles].filter((p) => p.endsWith(".md"))),
    ).sort();

    const diffs: FileDiff[] = [];
    for (const path of paths) {
      const [before, after] = await Promise.all([
        gitOps.readFileAtRef(dir, { ref: opts.target, filepath: path }),
        gitOps.readFileAtRef(dir, { ref: opts.source, filepath: path }),
      ]);

      if (before === after) continue;

      const status = before === null ? "added" : after === null ? "removed" : "modified";
      diffs.push({ path, status, changes: diffLines(before ?? "", after ?? "") });
    }

    return diffs;
  } finally {
    await discardScratchDir(dir);
  }
}
