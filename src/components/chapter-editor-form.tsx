"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/rich-text-editor";
import { commitChapterAction } from "@/lib/actions/chapters";
import { joinTitleAndBody } from "@/lib/markdown-utils";

export function ChapterEditorForm({
  owner,
  slug,
  branch,
  path,
  isNew,
  initialTitle,
  initialBody,
}: {
  owner: string;
  slug: string;
  branch: string;
  path: string;
  isNew: boolean;
  initialTitle: string;
  initialBody: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const content = joinTitleAndBody(title, body);
  const charCount = body.replace(/\s/g, "").length;
  const bodyRef = useRef<RichTextEditorHandle>(null);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form action={commitChapterAction} className="flex flex-col">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="branch" value={branch} />
        <input type="hidden" name="filepath" value={path} />
        <input type="hidden" name="content" value={content} />

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // A single-line input submits its form on Enter by default —
            // not what you want while naming a chapter (IME confirmation
            // also fires this). Move into the body instead, like Notion.
            if (e.key === "Enter") {
              e.preventDefault();
              bodyRef.current?.focus();
            }
          }}
          required
          placeholder="제목 없음"
          className="mb-6 border-none bg-transparent px-0 py-2 text-4xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
        />

        <RichTextEditor
          ref={bodyRef}
          content={initialBody}
          onChange={setBody}
          placeholder="본문을 입력하세요… '/' 대신 마크다운 문법을 그대로 쓸 수 있어요 (## 소제목, - 목록, > 인용)"
        />

        <div className="mt-6 flex items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            공백 제외 {charCount.toLocaleString()}자
          </p>
          <div className="flex flex-1 items-center justify-end gap-2">
            <input
              name="message"
              placeholder={isNew ? `${title || "새 회차"} 추가` : `${title || "회차"} 수정`}
              className="w-full max-w-64 rounded-md border-none bg-transparent px-2 py-1 text-right text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-accent/50"
            />
            <Button type="submit" size="sm">
              저장
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
