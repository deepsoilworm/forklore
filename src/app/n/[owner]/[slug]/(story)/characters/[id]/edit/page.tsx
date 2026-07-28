import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { getCharacter } from "@/lib/character-queries";
import { CharacterForm } from "@/components/character-form";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string; id: string }>;
}) {
  const { owner, slug, id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();
  if (!(await canWrite(found.novel, session.user.id))) {
    redirect(`/n/${owner}/${slug}/characters`);
  }

  const character = await getCharacter(found.novel.id, id);
  if (!character) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mx-auto w-full max-w-4xl text-lg font-medium">{character.name} 편집</h2>
      <CharacterForm
        owner={owner}
        slug={slug}
        initial={character}
        isOwner={session.user.id === found.novel.ownerId}
      />
    </div>
  );
}
