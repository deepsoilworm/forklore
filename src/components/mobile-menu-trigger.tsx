"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar-context";

export function MobileMenuTrigger() {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground sm:hidden"
      aria-label="메뉴 열기"
    >
      <Menu className="size-4" />
    </button>
  );
}
