"use client";

import { FolderKanban, LayoutDashboard, ScrollText, Settings2, Trophy, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { title: "Overview", href: "#overview", icon: LayoutDashboard },
  { title: "Projects", href: "#projects", icon: FolderKanban },
  { title: "Konfigurasi", href: "#config", icon: Settings2 },
  { title: "Penjurian", href: "#judging", icon: Trophy },
  { title: "Users", href: "#users", icon: Users },
  { title: "Audit", href: "#audit", icon: ScrollText },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            IW3
          </div>
          <div className="grid text-sm leading-tight">
            <span className="font-semibold">Backoffice</span>
            <span className="text-xs text-muted-foreground">IW3H Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.href}>
                  <SidebarMenuButton asChild>
                    <a href={n.href}>
                      <n.icon />
                      <span>{n.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
