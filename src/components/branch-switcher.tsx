"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function BranchSwitcher({
  branches,
  current,
}: {
  branches: { name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="branch" className="text-sm text-muted-foreground">
        브랜치
      </label>
      <select
        id="branch"
        defaultValue={current}
        className="h-8 rounded-md border bg-background px-2 text-sm"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams);
          params.set("branch", e.target.value);
          params.delete("path");
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {branches.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
