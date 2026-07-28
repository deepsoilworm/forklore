import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug } from "@/lib/queries";
import { NextRequest, NextResponse } from "next/server";

// Backs the unified sidebar's "current story" nav section. It re-checks
// canRead itself since this is a general-purpose endpoint, not gated by
// a page-level guard the way the (story) route group is.
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!owner || !slug) {
    return NextResponse.json({ error: "missing owner/slug" }, { status: 400 });
  }

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!(await canRead(found.novel, userId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: found.novel.name,
    owner,
    slug,
    isOwner: found.novel.ownerId === userId,
  });
}
