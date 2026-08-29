"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sidebarItems } from "@/navigation/sidebar-items";

export function NavMain() {
  const path = usePathname();
  // Root ("/") cocok persis; sub-halaman lain cocok kalau prefix-nya sama
  // (mis. /projects/123 → Projects aktif).
  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(`${url}/`);
  return (
    <>
      {sidebarItems.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "bg-sidebar-primary/15 font-medium text-sidebar-primary hover:bg-sidebar-primary/20 hover:text-sidebar-primary data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-primary"
                          : "text-sidebar-foreground/65 hover:text-sidebar-foreground"
                      }
                    >
                      <Link prefetch={false} href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
