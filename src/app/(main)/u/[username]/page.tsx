import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canRead, listNovelsForUser } from "@/lib/queries";
import { getDailyWritingStats } from "@/lib/stats-queries";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CoverThumbnail } from "@/components/cover-thumbnail";
import { WritingStats } from "@/components/writing-stats";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === user.id;
  const [allNovels, daily] = await Promise.all([
    listNovelsForUser(user.id),
    isOwner ? getDailyWritingStats(user.id) : Promise.resolve([]),
  ]);
  const visibility = await Promise.all(
    allNovels.map((row) => canRead(row.novel, session?.user?.id ?? null)),
  );
  const novels = allNovels.filter((_, i) => visibility[i]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{user.name ?? username}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>

      {isOwner && (
        <div className="mb-8">
          <WritingStats daily={daily} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {novels.map(({ novel }) => (
          <Link key={novel.id} href={`/n/${username}/${novel.slug}/read`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardContent className="flex gap-3">
                <CoverThumbnail name={novel.name} size="small" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{novel.name}</span>
                    <Badge
                      variant={novel.visibility === "public" ? "secondary" : "outline"}
                      className="shrink-0"
                    >
                      {novel.visibility === "public" ? "공개" : "비공개"}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {novel.description}
                  </p>
                  <div className="mt-auto flex gap-1 pt-1">
                    <Badge variant="outline">{CATEGORY_LABELS[novel.category]}</Badge>
                    <Badge variant="outline">{LANGUAGE_LABELS[novel.language]}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
