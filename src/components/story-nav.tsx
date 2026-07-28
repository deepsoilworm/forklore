"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StoryNav({
  base,
  tabs,
}: {
  base: string;
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((tab) => {
        // The "코드" tab's href is the bare base path, which is a prefix of
        // every other tab's href — so it only counts as active on an exact
        // match, while the rest also match their own sub-routes.
        const isActive =
          tab.href === base
            ? pathname === base
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
