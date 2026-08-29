"use client";

import { useAppKit } from "@reown/appkit/react";
import { ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Gerbang: connect + SIWE via modal. Reload otomatis setelah sign-in sukses
 *  (siweConfig.onSignIn) supaya server re-check role → dashboard. */
export default function SignInGate({ reason }: { reason: "signin" | "forbidden" }) {
  const { open } = useAppKit();
  const forbidden = reason === "forbidden";

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {forbidden ? <ShieldAlert className="size-6" /> : <Wallet className="size-6" />}
          </div>
          <CardTitle>Backoffice IW3H</CardTitle>
          <CardDescription>
            {forbidden
              ? "Wallet ini bukan admin. Minta admin lain menaikkan role kamu, lalu muat ulang."
              : "Khusus organizer. Sign in dengan wallet admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => open()}>
            <Wallet />
            {forbidden ? "Ganti wallet" : "Sign in dengan wallet"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
