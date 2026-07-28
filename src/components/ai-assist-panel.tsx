"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Kind = "continue" | "suggest" | "critique";

const labels: Record<Kind, string> = {
  continue: "이어쓰기",
  suggest: "전개 제안",
  critique: "비평 받기",
};

export function AiAssistPanel({
  novelId,
  getContent,
}: {
  novelId?: string;
  getContent: () => string;
}) {
  const [pending, setPending] = useState<Kind | null>(null);
  const [output, setOutput] = useState("");

  async function run(kind: Kind) {
    setPending(kind);
    setOutput("");
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, kind, content: getContent() }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 요청에 실패했어요");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">AI 집필 보조</p>
        <div className="flex gap-2">
          {(Object.keys(labels) as Kind[]).map((kind) => (
            <Button
              key={kind}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => run(kind)}
            >
              {pending === kind ? "생성 중..." : labels[kind]}
            </Button>
          ))}
        </div>
      </div>
      {output && (
        <div className="max-h-64 overflow-y-auto rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
          {output}
        </div>
      )}
    </div>
  );
}
