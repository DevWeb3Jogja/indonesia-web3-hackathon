"use client";

import { LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { short } from "@/lib/utils";
import ThemeToggleButton from "./ThemeToggleButton";

function UserMenu({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pr-3 pl-1 text-sm transition hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/[0.06]"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-black">
          {address.slice(2, 4).toUpperCase()}
        </span>
        <span className="hidden font-mono text-gray-700 sm:inline dark:text-gray-300">
          {short(address)}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-3 py-2">
            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">Admin</p>
            <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {short(address)}
            </p>
          </div>
          <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-theme-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({ address }: { address: string }) {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();

  const onToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex grow items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Toggle menu"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.06]"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Backoffice
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton />
          <UserMenu address={address} />
        </div>
      </div>
    </header>
  );
}
