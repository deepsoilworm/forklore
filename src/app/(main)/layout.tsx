import { ThinTopBar } from "@/components/thin-top-bar";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/docs", label: "가이드" },
  { href: "/about", label: "오픈소스" },
  { href: "/new", label: "새 이야기" },
  { href: "/u", label: "내 이야기" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <ThinTopBar items={NAV_ITEMS} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
