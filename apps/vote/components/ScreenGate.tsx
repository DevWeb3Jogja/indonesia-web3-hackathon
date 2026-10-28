"use client";

import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { projectId } from "@/lib/web3";

/**
 * Pengganti layar hitam saat /screen dibuka tanpa sesi admin (laptop videotron).
 * TIDAK menerima data apa pun dari server — hanya ajakan sign in / pesan khusus admin.
 */
export default function ScreenGate({ signedIn }: { signedIn: boolean }) {
  const { open } = useAppKit();
  const router = useRouter();

  // Setelah SIWE sukses (siwe.ts kirim event) → render ulang server dengan cookie baru.
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("iw3h:session", refresh);
    return () => window.removeEventListener("iw3h:session", refresh);
  }, [router]);

  return (
    <main className="screen-root">
      <div className="screen-gate">
        <img src="/logo.png" alt="Indonesia Web3 Hackathon" className="screen-gate-logo" />
        <h1 className="hero-heading screen-gate-title">Community Choice</h1>
        <p className="screen-gate-text">
          {signedIn
            ? "Layar ini khusus admin. Disconnect wallet ini dulu, lalu sambungkan wallet admin."
            : "Sign in dengan wallet admin untuk menampilkan layar."}
        </p>
        {projectId ? (
          <button type="button" className="screen-gate-btn" onClick={() => open()}>
            {signedIn ? "Ganti wallet" : "Sign in admin"}
          </button>
        ) : null}
      </div>
    </main>
  );
}
