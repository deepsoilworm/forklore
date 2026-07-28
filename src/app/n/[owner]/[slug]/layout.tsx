import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelByOwnerSlug } from "@/lib/queries";
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

  const base = `/n/${owner}/${slug}`;
  const tabs = [
    { href: base, label: "코드" },
    { href: `${base}/commits`, label: "커밋" },
    { href: `${base}/branches`, label: "브랜치" },
    { href: `${base}/pulls`, label: "풀 리퀘스트" },
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
