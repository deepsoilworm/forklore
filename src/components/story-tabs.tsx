"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

type Tab = { href: string; label: string };

// Readers only care about 읽기 — everything else (설정, 만남/노트, git
// tooling, PRs/issues, collaborators) is collaboration/authoring surface
// that would just be noise for someone who only wants to read. It's
// tucked behind "협업 참여" instead of hidden entirely: one click reveals
// it, and it stays revealed if you're already on one of those pages
// (e.g. arriving via a direct link) so nothing you're looking at
// disappears out from under you.
export function StoryTabs({ primary, more }: { primary: Tab[]; more: Tab[] }) {
  const pathname = usePathname();
  const all = [...primary, ...more];
  const matches = all.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0];
  const moreIsActive = more.some((item) => item.href === current?.href);

  const [expanded, setExpanded] = useState(() => moreIsActive);
  const visible = expanded ? all : primary;

  return (
    <div className="flex items-center gap-5 overflow-x-auto">
      {visible.map((item) => {
        const active = item.href === current?.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 border-b-2 pb-2.5 text-sm whitespace-nowrap transition-colors ${
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex shrink-0 items-center gap-0.5 border-b-2 border-transparent pb-2.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
        >
          협업 참여
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
