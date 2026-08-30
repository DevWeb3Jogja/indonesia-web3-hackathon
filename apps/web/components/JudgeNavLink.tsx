"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { localePath } from "@/lib/locale";
import { projectId } from "@/lib/web3";

/** Link ke /judge — hanya untuk wallet ber-role judge/admin. */
export default function JudgeNavLink({
  locale,
  label,
  className = "",
}: {
  locale: string;
  label: string;
  className?: string;
}) {
  if (!projectId) return null;
  return <Inner locale={locale} label={label} className={className} />;
}

function Inner({ locale, label, className }: { locale: string; label: string; className: string }) {
  const { address, isConnected } = useAppKitAccount();
  const [show, setShow] = useState(false);

  const check = useCallback(async () => {
    if (!isConnected) return setShow(false);
    try {
      const r = await fetch("/api/profile");
      const u = r.ok ? await r.json() : null;
      setShow(u?.role === "judge" || u?.role === "admin");
    } catch {
      setShow(false);
    }
  }, [isConnected]);

  // Re-cek saat connect, ganti wallet (address), dan saat sesi berubah (SIWE).
  // biome-ignore lint/correctness/useExhaustiveDependencies: address = pemicu re-cek saat ganti wallet
  useEffect(() => {
    check();
  }, [check, address]);

  useEffect(() => {
    const onSession = () => check();
    window.addEventListener("iw3h:session", onSession);
    return () => window.removeEventListener("iw3h:session", onSession);
  }, [check]);

  if (!show) return null;
  return (
    <Link href={localePath(locale, "/judge")} className={className}>
      {label}
    </Link>
  );
}
