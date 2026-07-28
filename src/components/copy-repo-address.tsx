"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyRepoAddress({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
      <code className="max-w-56 truncate text-xs text-muted-foreground sm:max-w-none">{path}</code>
      <Button type="button" variant="ghost" size="xs" onClick={copy}>
        {copied ? "복사됨" : "복사"}
      </Button>
    </div>
  );
}
