import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { ThinTopBar } from "@/components/thin-top-bar";

export default async function EditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ThinTopBar prefix={found.novel.name} />
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
