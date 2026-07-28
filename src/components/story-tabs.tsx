"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StoryTabs({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="flex gap-5 overflow-x-auto">
      {items.map((item) => {
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
    </div>
  );
}
