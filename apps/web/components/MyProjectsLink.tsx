"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { projectId } from "@/lib/web3";

/** Item nav "My Projects" — hanya tampil kalau wallet sudah connect.
 *  Guard projectId dulu (tanpa itu AppKit tak diinisialisasi → hook throw). */
export default function MyProjectsLink(props: { href: string; label: string; className?: string }) {
  if (!projectId) return null;
  return <Inner {...props} />;
}

function Inner({ href, label, className }: { href: string; label: string; className?: string }) {
  const { isConnected } = useAppKitAccount();
  if (!isConnected) return null;
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
