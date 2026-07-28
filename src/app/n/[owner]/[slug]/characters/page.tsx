import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { canWrite, getNovelByOwnerSlug } from "@/lib/queries";
import { listBranches, listMarkdownEntries } from "@/lib/git/novel-repo";
import { parseCharacterSheet } from "@/lib/character-utils";
import { Button } from "@/components/ui/button";
import { BranchSwitcher } from "@/components/branch-switcher";

const PREFIX = "characters/";

const COLUMNS: { key: "age" | "appearance" | "personality" | "goal" | "relationships"; label: string }[] = [
  { key: "age", label: "나이" },
  { key: "appearance", label: "외모" },
  { key: "personality", label: "성격" },
  { key: "goal", label: "목표" },
  { key: "relationships", label: "관계" },
];

export default async function CharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { owner, slug } = await params;
  const { branch: branchParam } = await searchParams;
  const found = await getNovelByOwnerSlug(owner, slug);
  if (!found) notFound();

  const branch = branchParam || found.novel.defaultBranch;
  const [session, branches, entries] = await Promise.all([
    auth(),
    listBranches(found.novel.id),
    listMarkdownEntries({ novelId: found.novel.id, ref: branch, prefix: PREFIX }),
  ]);

  const writable = session?.user?.id
    ? await canWrite(found.novel, session.user.id)
    : false;
  const base = `/n/${owner}/${slug}`;
  const characters = entries.map((entry) => ({
    ...entry,
    fields: parseCharacterSheet(entry.content, entry.file.replace(/\.md$/, "")),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BranchSwitcher branches={branches} current={branch} />
        {writable && (
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`${base}/edit?branch=${encodeURIComponent(branch)}&kind=character`}
              />
            }
          >
            새 인물 만들기
          </Button>
        )}
      </div>

      {characters.length === 0 ? (
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
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {characters.map(({ path, file, fields }) => (
                <tr key={path} className="hover:bg-accent/50">
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`${base}/characters/${encodeURIComponent(file)}?branch=${encodeURIComponent(branch)}`}
                      className="hover:underline"
                    >
                      {fields.name}
                    </Link>
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-muted-foreground">
                      {fields[col.key] || "—"}
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
