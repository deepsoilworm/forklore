import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { CharacterForm } from "@/components/character-form";

export default async function NewCharacterPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}/characters`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mx-auto w-full max-w-2xl text-lg font-medium">새 인물</h2>
      <CharacterForm owner={owner} slug={slug} />
    </div>
  );
}
