import { getUser } from "@iw3h/db";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import SignInGate from "@/components/SignInGate";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  // RBAC di layout: role dibaca segar dari DB, melindungi SEMUA route dashboard.
  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return <SignInGate reason="forbidden" />;

  return (
    <SidebarProvider>
      <AppSidebar address={user.address} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
          <span className="text-sm font-semibold">Backoffice IW3H</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
