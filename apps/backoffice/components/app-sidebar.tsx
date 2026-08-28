"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { SidebarUser } from "./sidebar-user";

export function AppSidebar({
  address,
  ...props
}: ComponentProps<typeof Sidebar> & { address: string }) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                  IW3
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Backoffice</span>
                  <span className="truncate text-xs text-muted-foreground">IW3H Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser address={address} />
      </SidebarFooter>
    </Sidebar>
  );
}
