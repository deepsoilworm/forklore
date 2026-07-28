import { put, head, del } from "@vercel/blob";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as tar from "tar";

// Each novel's git history lives as a single bare-repo tarball in Blob
// storage (source of truth), keyed by novel id. Every write operation:
//   1. acquires a Postgres advisory lock for the novel (see repo-lock.ts)
//   2. downloads + untars the bundle into a scratch dir under /tmp
//   3. runs one or more isomorphic-git operations against it
//   4. re-tars and re-uploads the bundle, replacing the old blob
//   5. releases the lock
// This keeps git itself as the source of truth for history/diff/merge
// instead of reinventing that logic on top of Postgres rows.

function blobKey(novelId: string) {
  return `repos/${novelId}.tar`;
}

export async function checkoutScratchDir(novelId: string): Promise<{
  dir: string;
  isNew: boolean;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), `forklore-${novelId}-`));
  await mkdir(dir, { recursive: true });

  const existing = await head(blobKey(novelId)).catch(() => null);
  if (!existing) {
    return { dir, isNew: true };
  }

  const res = await fetch(existing.url);
  if (!res.ok) {
    throw new Error(`Failed to download repo bundle for ${novelId}`);
  }
  const tarPath = path.join(tmpdir(), `forklore-${novelId}-in.tar`);
  await writeFile(tarPath, Buffer.from(await res.arrayBuffer()));
  await tar.extract({ file: tarPath, cwd: dir });
  await rm(tarPath, { force: true });

  return { dir, isNew: false };
}

export async function persistScratchDir(novelId: string, dir: string) {
  const tarPath = path.join(tmpdir(), `forklore-${novelId}-out.tar`);
  await tar.create({ cwd: dir, file: tarPath }, ["."]);

  const buf = await readFile(tarPath);
  await put(blobKey(novelId), buf, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await rm(tarPath, { force: true });
}

export async function discardScratchDir(dir: string) {
  await rm(dir, { recursive: true, force: true });
}

export async function deleteRepoBundle(novelId: string) {
  await del(blobKey(novelId)).catch(() => {});
}
