import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function MainSidebar() {
  const session = await auth();

  const links = [
    { href: "/", label: "홈" },
    { href: "/docs", label: "가이드" },
    { href: "/about", label: "오픈소스" },
  ];

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col gap-6 border-r px-3 py-4">
      <Link href="/" className="px-2 text-lg font-semibold tracking-tight">
        Forklore
      </Link>

      <nav className="flex flex-col gap-0.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        {session?.user && (
          <>
            <Link
              href="/new"
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              새 이야기
            </Link>
            <Link
              href={`/u/${session.user.username}`}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              내 이야기
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto">
        {session?.user ? (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback>
                  {session.user.username?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-muted-foreground">
                @{session.user.username}
              </span>
            </button>
          </form>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("github");
            }}
          >
            <Button type="submit" size="sm" className="w-full">
              GitHub로 로그인
            </Button>
          </form>
        )}
      </div>
    </aside>
  );
}
