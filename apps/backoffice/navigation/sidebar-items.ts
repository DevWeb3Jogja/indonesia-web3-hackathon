import {
  FolderKanban,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      { id: "overview", title: "Overview", url: "/", icon: LayoutDashboard },
      { id: "projects", title: "Projects", url: "/projects", icon: FolderKanban },
      { id: "judging", title: "Penjurian", url: "/judging", icon: Trophy },
    ],
  },
  {
    id: 2,
    label: "Kelola",
    items: [
      { id: "config", title: "Konfigurasi", url: "/config", icon: SlidersHorizontal },
      { id: "users", title: "Users", url: "/users", icon: Users },
      { id: "audit", title: "Audit log", url: "/audit", icon: ScrollText },
    ],
  },
];
