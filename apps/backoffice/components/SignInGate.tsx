"use client";

import { useAppKit } from "@reown/appkit/react";
import { ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InteractiveGridPattern } from "./interactive-grid";

/** Gerbang: connect + SIWE via modal. Reload otomatis setelah sign-in sukses
 *  (siweConfig.onSignIn) supaya server re-check role → dashboard. */
export default function SignInGate({ reason }: { reason: "signin" | "forbidden" }) {
  const { open } = useAppKit();
  const forbidden = reason === "forbidden";

  return (
    <div className="relative grid h-svh lg:grid-cols-2">
      {/* Panel brand (selalu gelap) */}
      <div className="relative hidden h-full flex-col overflow-hidden bg-zinc-900 p-10 text-white lg:flex">
        <InteractiveGridPattern className="inset-x-0 inset-y-0 h-full skew-y-12 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]" />
        <div className="relative z-20 flex items-center gap-2.5 text-lg font-semibold">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-xs font-bold">
            IW3
          </div>
          Backoffice IW3H
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;Manage submissions, judging, and winners for Indonesia Web3 Hackathon 2026 in
              one place.&rdquo;
            </p>
            <footer className="text-sm text-white/50">Organizer console</footer>
          </blockquote>
        </div>
      </div>

      {/* Panel form */}
      <div className="flex h-full items-center justify-center p-6 lg:p-8">
        <div className="flex w-full max-w-sm flex-col items-center space-y-6 text-center">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl",
              forbidden ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            {forbidden ? <ShieldAlert className="size-6" /> : <Wallet className="size-6" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {forbidden ? "Access denied" : "Backoffice IW3H"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {forbidden
                ? "This wallet is not an admin. Ask another admin to grant your role, then try again with the right wallet."
                : "Organizers only. Sign in with an admin wallet using SIWE (Sign-In with Ethereum)."}
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={() => open()}>
            <Wallet className="mr-1 size-4" />
            {forbidden ? "Switch wallet" : "Sign in with wallet"}
          </Button>
          <p className="text-muted-foreground px-4 text-xs leading-relaxed">
            You&rsquo;ll be asked to sign a message to prove wallet ownership — no transaction or
            fees.
          </p>
        </div>
      </div>
    </div>
  );
}
