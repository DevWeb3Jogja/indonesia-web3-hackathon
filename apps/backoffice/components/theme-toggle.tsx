"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Ganti tema">
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
