import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listEpisodes } from "@/lib/git/novel-repo";
import { NextRequest, NextResponse } from "next/server";

// Backs the sidebar's chapter tree while writing — only rendered under
// /edit, so it re-checks canWrite itself rather than relying on the page
// guard (this is a general-purpose endpoint).
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const slug = req.nextUrl.searchParams.get("slug");
  const branch = req.nextUrl.searchParams.get("branch");
  if (!owner || !slug) {
    return NextResponse.json({ error: "missing owner/slug" }, { status: 400 });
  }

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!(await canWrite(found.novel, userId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const episodes = await listEpisodes({
    novelId: found.novel.id,
    ref: branch || found.novel.defaultBranch,
  });

  return NextResponse.json({
    name: found.novel.name,
    owner,
    slug,
    branch: branch || found.novel.defaultBranch,
    episodes: episodes.map((ep) => ({ path: ep.path, index: ep.index, title: ep.title })),
  });
}
