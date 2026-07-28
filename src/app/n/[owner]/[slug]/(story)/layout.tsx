import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug } from "@/lib/queries";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { CoverThumbnail } from "@/components/cover-thumbnail";
import { StoryNav } from "@/components/story-nav";

export default async function NovelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const session = await auth();
  if (!(await canRead(found.novel, session?.user?.id ?? null))) notFound();

  const base = `/n/${owner}/${slug}`;
  const tabs = [
    { href: `${base}/read`, label: "읽기" },
    { href: base, label: "코드" },
    { href: `${base}/characters`, label: "인물" },
    { href: `${base}/encounters`, label: "만남" },
    { href: `${base}/commits`, label: "커밋" },
    { href: `${base}/branches`, label: "브랜치" },
    { href: `${base}/pulls`, label: "풀 리퀘스트" },
    { href: `${base}/issues`, label: "이슈" },
    ...(found.novel.ownerId === session?.user?.id
      ? [{ href: `${base}/collaborators`, label: "협업자" }]
      : []),
  ];

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r px-3 py-4 lg:flex">
        <Link href="/" className="px-2 text-base font-semibold tracking-tight">
          Forklore
        </Link>

        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center gap-2">
            <CoverThumbnail name={found.novel.name} size="small" />
            <div className="flex min-w-0 flex-col">
              <Link
                href={`/u/${owner}`}
                className="truncate text-xs text-muted-foreground hover:underline"
              >
                @{owner}
              </Link>
              <span className="truncate text-sm font-semibold">{found.novel.name}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={found.novel.visibility === "public" ? "secondary" : "outline"}>
              {found.novel.visibility === "public" ? "공개" : "비공개"}
            </Badge>
            <Badge variant="outline">{CATEGORY_LABELS[found.novel.category]}</Badge>
            <Badge variant="outline">{LANGUAGE_LABELS[found.novel.language]}</Badge>
          </div>
        </div>

        <StoryNav base={base} tabs={tabs} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Forklore
            </Link>
            <h1 className="truncate text-sm text-muted-foreground">
              <Link href={`/u/${owner}`}>{owner}</Link> / {found.novel.name}
            </h1>
          </div>
          <nav className="flex gap-4 overflow-x-auto text-sm">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
