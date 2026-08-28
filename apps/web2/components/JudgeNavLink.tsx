"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const { isConnected } = useAppKitAccount();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isConnected) return setShow(false);
    let alive = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => alive && setShow(u?.role === "judge" || u?.role === "admin"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isConnected]);

  if (!show) return null;
  return (
    <Link href={localePath(locale, "/judge")} className={className}>
      {label}
    </Link>
  );
}
