"use client";

import { useAppKit } from "@reown/appkit/react";
import { ShieldAlert, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Halaman gerbang: connect + SIWE via modal, lalu refresh supaya server re-check role. */
export default function SignInGate({ reason }: { reason: "signin" | "forbidden" }) {
  const { open } = useAppKit();
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.refresh();
  }, [isConnected, router]);

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
