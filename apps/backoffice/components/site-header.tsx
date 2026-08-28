import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { short } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ address }: { address: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 !h-5" />
      <h1 className="text-sm font-semibold">Backoffice IW3H</h1>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
          {short(address)}
        </span>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
