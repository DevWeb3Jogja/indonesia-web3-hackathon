"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { localePath } from "@/lib/locale";
import { projectId } from "@/lib/web3";

/** Link nav yang hanya muncul saat wallet tersambung (mis. Profile, Tim). */
export default function AuthNavLink({
  locale,
  href,
  label,
  className = "",
}: {
  locale: string;
  href: string;
  label: string;
  className?: string;
}) {
  if (!projectId) return null;
  return <Inner locale={locale} href={href} label={label} className={className} />;
}

function Inner({
  locale,
  href,
  label,
  className,
}: {
  locale: string;
  href: string;
  label: string;
  className: string;
}) {
  const { isConnected } = useAppKitAccount();
  if (!isConnected) return null;
  return (
    <Link href={localePath(locale, href)} className={className}>
      {label}
    </Link>
  );
}
