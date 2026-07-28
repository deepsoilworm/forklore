"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { Bold, Italic, Strikethrough, Heading2, Heading3, Quote } from "lucide-react";

function BubbleButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
        active ? "bg-accent text-foreground" : ""
      }`}
    >
      {children}
    </button>
  );
}

// Notion has no persistent toolbar chrome — formatting only surfaces as a
// floating bubble when text is selected, so the page reads like plain prose
// the rest of the time. Block types (headings, lists, quotes) are reachable
// via markdown shortcuts ("## ", "- ", "> ", ...) which StarterKit's input
// rules already handle.
function SelectionBubble({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} options={{ placement: "top" }}>
      <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
        <BubbleButton
          label="굵게 (⌘B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </BubbleButton>
        <BubbleButton
          label="기울임 (⌘I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </BubbleButton>
        <BubbleButton
          label="취소선"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </BubbleButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <BubbleButton
          label="소제목"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </BubbleButton>
        <BubbleButton
          label="작은 소제목"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </BubbleButton>
        <BubbleButton
          label="인용문"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "본문을 입력하세요…" }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const storage = editor.storage as unknown as { markdown: { getMarkdown(): string } };
      onChange(storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[28rem] text-base leading-8 focus:outline-none",
      },
    },
  });

  return (
    <>
      <SelectionBubble editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
}
