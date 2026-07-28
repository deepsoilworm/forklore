// The auto-generated README starts with "# {novel name}" as its own
// heading, but pages that already show the novel name as a heading would
// otherwise render the title twice. Strip a leading H1 line before display.
export function stripLeadingHeading(markdown: string): string {
  return markdown.replace(/^#\s+.+\n+/, "");
}
