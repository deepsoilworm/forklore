import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug } from "@/lib/queries";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link href={`/u/${owner}`} className="text-muted-foreground">
            {owner}
          </Link>{" "}
          / {found.novel.name}
        </h1>
        <Badge variant={found.novel.visibility === "public" ? "secondary" : "outline"}>
          {found.novel.visibility === "public" ? "공개" : "비공개"}
        </Badge>
        <Badge variant="outline">{CATEGORY_LABELS[found.novel.category]}</Badge>
        <Badge variant="outline">{LANGUAGE_LABELS[found.novel.language]}</Badge>
      </div>
      <nav className="mb-6 flex gap-4 border-b text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pb-2 text-muted-foreground hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
