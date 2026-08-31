"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

/**
 * Tema minimal tanpa next-themes (yang menyuntik <script> di client → warning
 * React 19). Kelas `.dark` di <html> di-set boot-script (lihat layout <head>);
 * hook ini hanya toggle kelas + simpan ke localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
    try {
      localStorage.setItem("theme", mode);
    } catch {
      /* mode privat / storage diblok — abaikan */
    }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
