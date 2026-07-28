"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form action={commitChapterAction} className="flex flex-col gap-4">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="branch" value={branch} />
        <input type="hidden" name="filepath" value={path} />
        <input type="hidden" name="content" value={content} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="title">회차 제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="프롤로그"
            className="text-lg font-medium"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>본문</Label>
          <RichTextEditor
            content={initialBody}
            onChange={setBody}
            placeholder="본문을 입력하세요… ⌘B 굵게, ⌘I 기울임"
          />
          <p className="text-right text-xs text-muted-foreground">
            공백 제외 {charCount.toLocaleString()}자
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="message">무엇이 바뀌었나요?</Label>
          <Input
            id="message"
            name="message"
            placeholder={isNew ? `${title || "새 회차"} 추가` : `${title || "회차"} 수정`}
          />
        </div>
        <Button type="submit" className="self-start">
          저장
        </Button>
      </form>
    </div>
  );
}
