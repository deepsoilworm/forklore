import { auth } from "@/auth";
import { listRecentNovels, listStarredNovels } from "@/lib/queries";
import { NextResponse } from "next/server";

// Backs the sidebar's "최근 항목" / "찜한 작품" sections. Returns empty
// arrays (not 401) when signed out, so the client can render the sections'
// pinned empty-state instead of treating it as an error.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ recent: [], starred: [] });

  const [recent, starred] = await Promise.all([
    listRecentNovels(userId),
    listStarredNovels(userId),
  ]);
  return NextResponse.json({ recent, starred });
}
