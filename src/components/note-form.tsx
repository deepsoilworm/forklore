"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";

export function NoteForm({
  owner,
  slug,
  action,
  noteId,
  initialTitle = "",
  initialBody = "",
}: {
  owner: string;
  slug: string;
  action: (formData: FormData) => Promise<void>;
  noteId?: string;
  initialTitle?: string;
  initialBody?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="slug" value={slug} />
      {noteId && <input type="hidden" name="noteId" value={noteId} />}
      <input type="hidden" name="body" value={body} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={150}
          placeholder="예: 여우 정령 설정"
          className="text-lg font-medium"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>내용</Label>
        <div className="rounded-md border px-4 py-3">
          <RichTextEditor
            content={initialBody}
            onChange={setBody}
            placeholder="설정, 자료, 참고 메모를 자유롭게 적어보세요…"
          />
        </div>
      </div>

      <Button type="submit" className="self-start">
        저장
      </Button>
    </form>
  );
}
