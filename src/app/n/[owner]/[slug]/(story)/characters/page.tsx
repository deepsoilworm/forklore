import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listCharacters } from "@/lib/character-queries";
import { Button } from "@/components/ui/button";

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const session = await auth();
  const [writable, characterList] = await Promise.all([
    session?.user?.id ? canWrite(found.novel, session.user.id) : false,
    listCharacters(found.novel.id),
  ]);

  const base = `/n/${owner}/${slug}`;

  // Table columns = every distinct field label used by any character in
  // this story, in first-seen order — characters missing a given label
  // just show a blank cell for it.
  const columns: string[] = [];
  for (const c of characterList) {
    for (const f of c.fields) {
      if (!columns.includes(f.label)) columns.push(f.label);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        {writable && (
          <Button size="sm" nativeButton={false} render={<Link href={`${base}/characters/new`} />}>
            새 인물 만들기
          </Button>
        )}
      </div>

      {characterList.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          아직 등록된 인물이 없어요. 이름, 관계, 설정을 정리해두면 협업자들과 일관성을
          맞추기 쉬워져요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">이름</th>
                {columns.map((label) => (
                  <th key={label} className="px-4 py-2 font-medium whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {characterList.map((c) => (
                <tr key={c.id} className="hover:bg-accent/50">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                    <Link href={`${base}/characters/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  {columns.map((label) => (
                    <td key={label} className="px-4 py-2.5 text-muted-foreground">
                      {c.fields.find((f) => f.label === label)?.value || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
