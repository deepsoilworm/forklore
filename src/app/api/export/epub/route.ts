import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug } from "@/lib/queries";
import { getChapterContent, listEpisodes } from "@/lib/git/novel-repo";
import { splitTitleAndBody } from "@/lib/markdown-utils";
import { marked } from "marked";
import epub from "epub-gen-memory";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!owner || !slug) {
    return NextResponse.json({ error: "missing owner/slug" }, { status: 400 });
  }

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await auth();
  if (!(await canRead(found.novel, session?.user?.id ?? null))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const branch = req.nextUrl.searchParams.get("branch") || found.novel.defaultBranch;
  const episodes = await listEpisodes({ novelId: found.novel.id, ref: branch });
  if (episodes.length === 0) {
    return NextResponse.json({ error: "내보낼 회차가 없어요" }, { status: 400 });
  }

  const chapters = await Promise.all(
    episodes.map(async (ep) => {
      const raw = await getChapterContent({ novelId: found.novel.id, ref: branch, filepath: ep.path });
      const { body } = splitTitleAndBody(raw ?? "");
      return { title: ep.title, content: await marked.parse(body) };
    }),
  );

  const buffer = await epub(
    {
      title: found.novel.name,
      author: owner,
      lang: found.novel.language === "en" ? "en" : found.novel.language === "ja" ? "ja" : "ko",
      description: found.novel.description ?? undefined,
    },
    chapters,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(found.novel.slug)}.epub"`,
    },
  });
}
