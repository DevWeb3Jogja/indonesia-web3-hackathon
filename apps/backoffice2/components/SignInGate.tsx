"use client";

import { Button, Card, CardBody } from "@heroui/react";
import { useAppKit } from "@reown/appkit/react";
import { ShieldAlert, Wallet } from "lucide-react";
import { InteractiveGridPattern } from "./interactive-grid";

/** Gerbang: connect + SIWE via modal. Reload otomatis setelah sign-in sukses
 *  (siweConfig.onSignIn) supaya server re-check role → dashboard.
 *  Reskin HeroUI (template kuma-mieru) untuk komparasi. */
export default function SignInGate({ reason }: { reason: "signin" | "forbidden" }) {
  const { open } = useAppKit();
  const forbidden = reason === "forbidden";

  return (
    <div className="relative grid h-svh lg:grid-cols-2">
      {/* Panel brand (selalu gelap) */}
      <div className="relative hidden h-full flex-col overflow-hidden bg-gradient-to-br from-primary-900 via-zinc-900 to-black p-10 text-white lg:flex">
        <InteractiveGridPattern className="inset-x-0 inset-y-0 h-full skew-y-12 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]" />
        <div className="relative z-20 flex items-center gap-2.5 text-lg font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
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

      {/* Panel form — HeroUI Card */}
      <div className="flex h-full items-center justify-center bg-content1 p-6 lg:p-8">
        <Card className="w-full max-w-sm border border-default-100" shadow="sm">
          <CardBody className="flex flex-col items-center gap-6 p-8 text-center">
            <div
              className={`flex size-12 items-center justify-center rounded-xl ${
                forbidden ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
              }`}
            >
              {forbidden ? <ShieldAlert className="size-6" /> : <Wallet className="size-6" />}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {forbidden ? "Access denied" : "Backoffice IW3H"}
              </h1>
              <p className="text-sm leading-relaxed text-default-500">
                {forbidden
                  ? "This wallet is not an admin. Ask another admin to grant your role, then try again with the right wallet."
                  : "Organizers only. Sign in with an admin wallet using SIWE (Sign-In with Ethereum)."}
              </p>
            </div>
            <Button
              color={forbidden ? "danger" : "primary"}
              size="lg"
              radius="lg"
              className="w-full font-medium"
              startContent={<Wallet className="size-4" />}
              onPress={() => open()}
            >
              {forbidden ? "Switch wallet" : "Sign in with wallet"}
            </Button>
            <p className="px-4 text-xs leading-relaxed text-default-400">
              You&rsquo;ll be asked to sign a message to prove wallet ownership — no transaction or
              fees.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
