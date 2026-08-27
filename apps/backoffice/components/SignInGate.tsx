"use client";

import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "wagmi";

/** Halaman gerbang: connect + SIWE via modal, lalu refresh supaya server re-check role. */
export default function SignInGate({ reason }: { reason: "signin" | "forbidden" }) {
  const { open } = useAppKit();
  const { isConnected } = useAccount();
  const router = useRouter();

  // Setelah SIWE sukses modal menutup — re-render halaman server untuk cek role.
  useEffect(() => {
    if (isConnected) router.refresh();
  }, [isConnected, router]);

  return (
    <main className="gate">
      <h1>Backoffice IW3H</h1>
      {reason === "forbidden" ? (
        <p>
          Wallet ini bukan admin. Minta admin lain menaikkan role kamu, lalu muat ulang halaman ini.
        </p>
      ) : (
        <p>Khusus organizer. Sign in dengan wallet admin.</p>
      )}
      <button type="button" onClick={() => open()}>
        {reason === "forbidden" ? "Ganti wallet" : "Sign in dengan wallet"}
      </button>
    </main>
  );
}
