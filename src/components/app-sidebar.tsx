"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, X } from "lucide-react";
import { useSidebar } from "@/components/sidebar-context";

const MAIN_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/docs", label: "가이드" },
  { href: "/about", label: "오픈소스" },
];

type StoryNavData = { name: string; owner: string; slug: string; isOwner: boolean };

function storyTabs(base: string, isOwner: boolean) {
  return [
    { href: `${base}/read`, label: "읽기" },
    { href: base, label: "코드" },
    { href: `${base}/characters`, label: "인물" },
    { href: `${base}/encounters`, label: "만남" },
    { href: `${base}/commits`, label: "커밋" },
    { href: `${base}/branches`, label: "브랜치" },
    { href: `${base}/pulls`, label: "풀 리퀘스트" },
    { href: `${base}/issues`, label: "이슈" },
    ...(isOwner ? [{ href: `${base}/collaborators`, label: "협업자" }] : []),
  ];
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppSidebar({
  session,
  signInAction,
  signOutAction,
}: {
  session: { username: string | null; image: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  // Holds the most recently fetched story's nav data — never reset to null
  // directly; `storyNav` below derives whether it's still relevant to the
  // current route, so leaving a story hides it without a setState-in-effect.
  const [fetchedStoryNav, setFetchedStoryNav] = useState<StoryNavData | null>(null);

  const storyMatch = pathname.match(/^\/n\/([^/]+)\/([^/]+)/);
  const storyNav =
    storyMatch && fetchedStoryNav?.owner === storyMatch[1] && fetchedStoryNav?.slug === storyMatch[2]
      ? fetchedStoryNav
      : null;

  useEffect(() => {
    if (!storyMatch) return;
    const [, owner, slug] = storyMatch;

    let cancelled = false;
    fetch(`/api/story-nav?owner=${encodeURIComponent(owner)}&slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFetchedStoryNav(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyMatch?.[1], storyMatch?.[2]]);

  const content = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="px-1 text-lg font-semibold tracking-tight">
          Forklore
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="hidden rounded-md p-1 text-muted-foreground hover:bg-accent/50 lg:block"
          aria-label="사이드바 접기"
        >
          <PanelLeftClose className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent/50 lg:hidden"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {MAIN_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActive(pathname, item.href, item.href === "/")}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
        {session?.username && (
          <>
            <NavLink
              href="/new"
              label="새 이야기"
              active={isActive(pathname, "/new", false)}
              onNavigate={() => setMobileOpen(false)}
            />
            <NavLink
              href={`/u/${session.username}`}
              label="내 이야기"
              active={isActive(pathname, `/u/${session.username}`, false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </>
        )}
      </nav>

      {storyNav && (
        <div className="flex flex-col gap-1">
          <span className="truncate px-2.5 text-xs font-medium text-muted-foreground">
            {storyNav.name}
          </span>
          <nav className="flex flex-col gap-0.5">
            {storyTabs(`/n/${storyNav.owner}/${storyNav.slug}`, storyNav.isOwner).map((tab) => (
              <NavLink
                key={tab.href}
                href={tab.href}
                label={tab.label}
                active={isActive(pathname, tab.href, tab.href === `/n/${storyNav.owner}/${storyNav.slug}`)}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}

      <div className="mt-auto">
        {session?.username ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={session.image ?? undefined} />
                <AvatarFallback>{session.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate text-muted-foreground">@{session.username}</span>
            </button>
          </form>
        ) : (
          <form action={signInAction}>
            <Button type="submit" size="sm" className="w-full">
              GitHub로 로그인
            </Button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: persistent sidebar. When collapsed, the expand toggle
          lives inline in ThinTopBar instead of floating over the page. */}
      <div
        className={`hidden shrink-0 border-r lg:block ${
          collapsed ? "w-0 overflow-hidden border-r-0" : "w-56"
        }`}
      >
        {content}
      </div>

      {/* Mobile: overlay drawer, opened via the hamburger in ThinTopBar. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 border-r bg-background">{content}</div>
          <button
            type="button"
            className="flex-1 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="닫기"
          />
        </div>
      )}
    </>
  );
}
