"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { Markdown } from "@/components/markdown";
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
  const charCount = content.replace(/\s/g, "").length;

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

        <Tabs defaultValue="write">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">본문 (Markdown)</Label>
            <TabsList>
              <TabsTrigger value="write">쓰기</TabsTrigger>
              <TabsTrigger value="preview">미리보기</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="write">
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={24}
              className="min-h-[32rem] resize-y text-base leading-8"
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              공백 제외 {charCount.toLocaleString()}자
            </p>
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[32rem] rounded-md border px-4 py-3">
              {content.trim() ? (
                <Markdown content={content} size="reading" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  본문을 입력하면 여기에 미리보기가 표시돼요.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Tabs unmount inactive panels, so the textarea may not be in the DOM at
            submit time — this hidden field is the single source of truth for content. */}
        <input type="hidden" name="content" value={content} />

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
