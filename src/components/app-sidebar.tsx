"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, PanelLeftClose, X } from "lucide-react";
import { useSidebar } from "@/components/sidebar-context";

const MAIN_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/docs", label: "가이드" },
  { href: "/about", label: "오픈소스" },
];

type SidebarNovelData = { id: string; name: string; owner: string; slug: string };
type SidebarLists = { recent: SidebarNovelData[]; starred: SidebarNovelData[] };
type EditNavData = {
  name: string;
  owner: string;
  slug: string;
  branch: string;
  episodes: { path: string; index: number; title: string }[];
};

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SectionHeader({ label }: { label: string }) {
  return (
    <span className="truncate px-2.5 text-xs font-medium text-muted-foreground">{label}</span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 text-xs text-muted-foreground/60">{children}</p>;
}

function NovelListSection({
  label,
  novels,
  emptyHint,
  onNavigate,
}: {
  label: string;
  novels: SidebarNovelData[];
  emptyHint: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionHeader label={label} />
      {novels.length === 0 ? (
        <EmptyHint>{emptyHint}</EmptyHint>
      ) : (
        <nav className="flex flex-col gap-0.5">
          {novels.map((novel) => (
            <Link
              key={novel.id}
              href={`/n/${novel.owner}/${novel.slug}`}
              onClick={onNavigate}
              className="truncate rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              {novel.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function EditChapterTree({
  nav,
  pathname,
  onNavigate,
}: {
  nav: EditNavData;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const searchParams = useSearchParams();
  const base = `/n/${nav.owner}/${nav.slug}`;
  const branchQuery = `branch=${encodeURIComponent(nav.branch)}`;
  const currentPath = searchParams.get("path");

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent/50"
      >
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="truncate">{nav.name}</span>
      </button>
      {open && (
        <nav className="flex flex-col gap-0.5 pl-5">
          <Link
            href={`${base}/edit?${branchQuery}`}
            onClick={onNavigate}
            className={`truncate rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              pathname === `${base}/edit` && !currentPath
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            + 새 회차
          </Link>
          {nav.episodes.map((ep) => (
            <Link
              key={ep.path}
              href={`${base}/edit?${branchQuery}&path=${encodeURIComponent(ep.path)}`}
              onClick={onNavigate}
              className={`truncate rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                currentPath === ep.path
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {ep.index}. {ep.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
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
  const [lists, setLists] = useState<SidebarLists>({ recent: [], starred: [] });
  const [fetchedEditNav, setFetchedEditNav] = useState<EditNavData | null>(null);

  useEffect(() => {
    if (!session?.username) return;
    let cancelled = false;
    fetch("/api/sidebar-lists")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setLists(data);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetched on every route change so a just-visited or just-starred
    // novel shows up without a full sidebar reload.
  }, [session?.username, pathname]);

  const editMatch = pathname.match(/^\/n\/([^/]+)\/([^/]+)\/edit$/);
  const editNav =
    editMatch && fetchedEditNav?.owner === editMatch[1] && fetchedEditNav?.slug === editMatch[2]
      ? fetchedEditNav
      : null;

  useEffect(() => {
    if (!editMatch) return;
    const [, owner, slug] = editMatch;
    let cancelled = false;
    fetch(`/api/edit-nav?owner=${encodeURIComponent(owner)}&slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFetchedEditNav(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMatch?.[1], editMatch?.[2]]);

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
      </nav>

      {editNav && (
        <EditChapterTree nav={editNav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      )}

      {session?.username && (
        <div className="flex flex-col gap-1">
          <SectionHeader label="라이브러리" />
          <nav className="flex flex-col gap-0.5">
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
          </nav>
        </div>
      )}

      {session?.username && (
        <NovelListSection
          label="최근 항목"
          novels={lists.recent}
          emptyHint="아직 열람한 작품이 없어요"
          onNavigate={() => setMobileOpen(false)}
        />
      )}

      {session?.username && (
        <NovelListSection
          label="찜한 작품"
          novels={lists.starred}
          emptyHint="찜한 작품이 없어요"
          onNavigate={() => setMobileOpen(false)}
        />
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
