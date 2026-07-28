"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
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

        <Tabs defaultValue="write">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">본문</Label>
            <TabsList>
              <TabsTrigger value="write">쓰기</TabsTrigger>
              <TabsTrigger value="preview">미리보기</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="write">
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={24}
              className="min-h-[32rem] resize-y text-base leading-8"
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              공백 제외 {charCount.toLocaleString()}자
            </p>
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[32rem] rounded-md border px-4 py-3">
              {body.trim() ? (
                <Markdown content={content} size="reading" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  본문을 입력하면 여기에 미리보기가 표시돼요.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

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
