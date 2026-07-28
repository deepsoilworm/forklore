"use client";

import { updateStoryStatusAction } from "@/lib/actions/novels";
import { STATUS_LABELS } from "@/lib/labels";

export function StatusSwitcher({
  owner,
  slug,
  status,
  options,
}: {
  owner: string;
  slug: string;
  status: string;
  options: readonly string[];
}) {
  return (
    <form action={updateStoryStatusAction}>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="slug" value={slug} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-7 rounded-md border bg-background px-2 text-xs"
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
    </form>
  );
}
