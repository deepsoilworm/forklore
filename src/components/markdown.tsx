import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({
  content,
  size = "default",
}: {
  content: string;
  size?: "default" | "reading";
}) {
  return (
    <div
      className={
        size === "reading"
          ? "prose prose-neutral dark:prose-invert max-w-none prose-p:leading-8 prose-p:text-[1.05rem] prose-headings:tracking-tight"
          : "prose prose-neutral dark:prose-invert max-w-none"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
