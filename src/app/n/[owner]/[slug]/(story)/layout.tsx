import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canRead, getNovelByOwnerSlug, recordNovelVisit } from "@/lib/queries";
import { ThinTopBar } from "@/components/thin-top-bar";

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

  if (session?.user?.id) {
    // Fire-and-forget: recency for the sidebar's "최근 항목", not
    // something the page needs to wait on.
    void recordNovelVisit(found.novel.id, session.user.id);
  }

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
    <div className="flex min-h-full flex-col">
      <ThinTopBar prefix={found.novel.name} items={tabs} />
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
