import { MainSidebar } from "@/components/main-sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <MainSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
