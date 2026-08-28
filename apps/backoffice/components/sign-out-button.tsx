"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    window.location.reload();
  }
  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      <LogOut />
      Keluar
    </Button>
  );
}
