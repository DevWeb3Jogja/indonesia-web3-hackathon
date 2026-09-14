"use client";

import {
  FileClock,
  Gavel,
  LayoutGrid,
  type LucideIcon,
  Settings,
  SquareKanban,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/users", label: "Users", icon: Users },
  { href: "/projects", label: "Projects", icon: SquareKanban },
  { href: "/judging", label: "Judging", icon: Gavel },
  { href: "/config", label: "Configuration", icon: Settings },
  { href: "/audit", label: "Audit log", icon: FileClock },
];

export default function Sidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const wide = isExpanded || isMobileOpen || isHovered;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 py-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900",
        wide ? "w-[280px]" : "w-[90px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Brand — logo IW3H (dari web) */}
      <Link
        href="/"
        className={cn("flex items-center gap-2.5 py-1.5", wide ? "px-1" : "justify-center")}
      >
        <Image
          src="/logo.png"
          alt="Indonesia Web3 Hackathon"
          width={36}
          height={36}
          priority
          className="size-9 shrink-0"
        />
        {wide && (
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-gray-800 dark:text-white/90">IW3H</span>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">Backoffice</span>
          </span>
        )}
      </Link>

      <div className="mt-6 flex flex-col gap-1">
        <p
          className={cn(
            "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400",
            !wide && "text-center"
          )}
        >
          {wide ? "Menu" : "•••"}
        </p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "menu-item group",
                  active ? "menu-item-active" : "menu-item-inactive",
                  !wide && "justify-center"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  )}
                />
                {wide && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {wide && (
        <div className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Indonesia Web3 Hackathon
          </p>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            Admin backoffice · 2026 edition
          </p>
        </div>
      )}
    </aside>
  );
}
