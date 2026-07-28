"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

type Tab = { href: string; label: string };

function TabLink({ item, active }: { item: Tab; active: boolean }) {
  return (
    <Link
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
}

// Readers only care about 읽기 — everything else (설정 자료, git 기록,
// 운영) is collaboration/authoring surface that would just be noise for
// someone who only wants to read. It's tucked behind "협업 참여" instead
// of hidden entirely: one click reveals it, and it stays revealed if
// you're already on one of those pages (e.g. arriving via a direct link)
// so nothing you're looking at disappears out from under you.
//
// The revealed tabs are grouped — this work's own material (인물/만남/
// 노트/이슈/협업자) vs. the underlying git mechanics (코드/커밋/브랜치/
// 풀 리퀘스트) — with a divider between, rather than one flat row mixing
// both kinds of thing.
export function StoryTabs({ primary, moreGroups }: { primary: Tab[]; moreGroups: Tab[][] }) {
  const pathname = usePathname();
  const more = moreGroups.flat();
  const all = [...primary, ...more];
  const matches = all.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0];
  const moreIsActive = more.some((item) => item.href === current?.href);

  const [expanded, setExpanded] = useState(() => moreIsActive);

  return (
    <div className="flex items-center gap-5 overflow-x-auto">
      {primary.map((item) => (
        <TabLink key={item.href} item={item} active={item.href === current?.href} />
      ))}
      {expanded &&
        moreGroups.map((group, i) => (
          <div key={i} className="flex items-center gap-5">
            <div className="h-4 w-px shrink-0 bg-border" />
            {group.map((item) => (
              <TabLink key={item.href} item={item} active={item.href === current?.href} />
            ))}
          </div>
        ))}
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
