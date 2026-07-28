"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { commitChapterAction } from "@/lib/actions/chapters";

export function ChapterEditorForm({
  owner,
  slug,
  branch,
  novelId,
  path,
  defaultFilepathPrefix = "chapters/",
  initialContent,
}: {
  owner: string;
  slug: string;
  branch: string;
  novelId: string;
  path: string | null;
  defaultFilepathPrefix?: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <form action={commitChapterAction} className="flex flex-1 flex-col gap-4">
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="branch" value={branch} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="filepath">파일 경로</Label>
          <Input
            id="filepath"
            name="filepath"
            defaultValue={path ?? defaultFilepathPrefix}
            placeholder="chapters/01-prologue.md"
            required
            readOnly={Boolean(path)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="content">본문 (Markdown)</Label>
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="message">커밋 메시지</Label>
          <Input
            id="message"
            name="message"
            required
            placeholder={path ? "1화 오탈자 수정" : "1화 추가"}
          />
        </div>
        <Button type="submit" className="self-start">
          커밋
        </Button>
      </form>

      <div className="w-full lg:w-80">
        <AiAssistPanel novelId={novelId} getContent={() => content} />
      </div>
    </div>
  );
}
