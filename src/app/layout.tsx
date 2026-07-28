import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { auth, signIn, signOut } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/sidebar-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forklore — 함께 쓰는 오픈소스 이야기 플랫폼",
  description: "Git처럼 브랜치, 커밋, 머지로 협업하며 이야기를 쓰는 오픈소스 플랫폼",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  async function signInAction() {
    "use server";
    await signIn("github");
  }

  async function signOutAction() {
    "use server";
    await signOut();
  }

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <SidebarProvider>
          <div className="flex min-h-full">
            <AppSidebar
              session={
                session?.user
                  ? { username: session.user.username, image: session.user.image ?? null }
                  : null
              }
              signInAction={signInAction}
              signOutAction={signOutAction}
            />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
