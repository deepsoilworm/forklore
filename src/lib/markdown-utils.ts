// The auto-generated README starts with "# {novel name}" as its own
// heading, but pages that already show the novel name as a heading would
// otherwise render the title twice. Strip a leading H1 line before display.
export function stripLeadingHeading(markdown: string): string {
  return markdown.replace(/^#\s+.+\n+/, "");
}

// Chapter files are always "# 제목\n\n본문..." — split that into a title the
// writer edits in a plain text field and a body they edit separately, so
// they never have to touch Markdown heading syntax by hand.
export function splitTitleAndBody(markdown: string): { title: string; body: string } {
  const match = markdown.match(/^#\s+(.+)\n+([\s\S]*)$/);
  if (!match) return { title: "", body: markdown };
  return { title: match[1].trim(), body: match[2] };
}

export function joinTitleAndBody(title: string, body: string): string {
  return `# ${title.trim()}\n\n${body.trim()}\n`;
}
