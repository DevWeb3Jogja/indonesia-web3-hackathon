"use client";

import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import Backdrop from "./Backdrop";
import Header from "./Header";
import Sidebar from "./Sidebar";

function Shell({ address, children }: { address: string; children: React.ReactNode }) {
  const { isExpanded, isHovered } = useSidebar();
  const ml = isExpanded || isHovered ? "lg:ml-[280px]" : "lg:ml-[90px]";
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Backdrop />
      <div className={cn("flex min-h-screen flex-col transition-all duration-300 ease-in-out", ml)}>
        <Header address={address} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({
  address,
  children,
}: {
  address: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Shell address={address}>{children}</Shell>
    </SidebarProvider>
  );
}
