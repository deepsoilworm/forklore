"use client";

import { usePathname } from "next/navigation";
import { PanelLeft, Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar-context";

export function ThinTopBar({
  prefix,
  items,
}: {
  prefix?: string;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, setMobileOpen } = useSidebar();

  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2 text-sm text-muted-foreground">
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="hidden rounded-md p-1.5 hover:bg-accent/50 hover:text-foreground lg:block"
          aria-label="사이드바 펼치기"
        >
          <PanelLeft className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="rounded-md p-1.5 hover:bg-accent/50 hover:text-foreground lg:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="size-4" />
      </button>
      <span className="truncate">
        {prefix}
        {prefix && current && <span className="mx-1.5 text-muted-foreground/50">/</span>}
        {current?.label}
      </span>
    </div>
  );
}
