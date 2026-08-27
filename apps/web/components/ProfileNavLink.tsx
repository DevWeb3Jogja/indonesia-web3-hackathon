"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { localePath } from "@/lib/locale";
import { projectId } from "@/lib/web3";

/** Link ke /profile — hanya muncul saat wallet tersambung. */
export default function ProfileNavLink({
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
  if (!isConnected) return null;
  return (
    <Link href={localePath(locale, "/profile")} className={className}>
      {label}
    </Link>
  );
}
