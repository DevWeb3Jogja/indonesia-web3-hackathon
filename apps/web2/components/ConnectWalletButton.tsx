"use client";

import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { localePath } from "@/lib/locale";
import { projectId } from "@/lib/web3";
import { GeneratedAvatar } from "./GeneratedAvatar";

/** Connect wallet. Saat terhubung → dropdown (My Projects · Profile · Disconnect). */
export default function ConnectWalletButton({
  className = "",
  locale,
}: {
  className?: string;
  locale?: string;
}) {
  if (!projectId) return null;
  return <Inner className={className} locale={locale} />;
}

function Inner({ className, locale }: { className: string; locale?: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  if (!isConnected || !address) {
    return (
      <button type="button" onClick={() => open()} className={className}>
        Connect Wallet
      </button>
    );
  }

  const addr: string = address;
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const to = (path: string) => (locale ? localePath(locale, path) : path);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* konteks non-secure — abaikan */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setMenu((v) => !v)} className={className}>
        <span className="inline-flex items-center gap-2">
          <GeneratedAvatar name={address} size={20} className="-ml-1" />
          {short}
        </span>
      </button>
      {menu && (
        <div className="ev-wallet-menu">
          <div className="ev-wm-head">
            <GeneratedAvatar name={address} size={40} />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold">{short}</p>
              <p className="text-xs text-white/50">BNB Smart Chain</p>
            </div>
          </div>
          <div className="ev-wm-group">
            <Link href={to("/my")} onClick={() => setMenu(false)} className="ev-wm-item">
              My Projects
            </Link>
            <Link href={to("/profile")} onClick={() => setMenu(false)} className="ev-wm-item">
              Profile
            </Link>
            <button type="button" onClick={copy} className="ev-wm-item">
              {copied ? "Copied!" : "Copy address"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              disconnect();
              setMenu(false);
            }}
            className="ev-wm-item ev-wm-danger"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
