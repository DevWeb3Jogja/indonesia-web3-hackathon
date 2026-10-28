"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSignIn } from "@/components/SignInProvider";

/**
 * Pengganti layar hitam saat /screen?demo=1 dibuka tanpa sesi admin.
 * TIDAK menerima data apa pun dari server — hanya ajakan sign in / pesan khusus admin.
 */
export default function ScreenGate({ signedIn }: { signedIn: boolean }) {
  const { enabled, open, signOut } = useSignIn();
  const router = useRouter();

  // Setelah login (SignInProvider kirim event) → render ulang server dengan cookie baru.
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
            ? "Mode demo khusus admin. Keluar dulu, lalu masuk pakai wallet admin."
            : "Sign in dengan wallet admin untuk menampilkan layar."}
        </p>
        {enabled ? (
          <button
            type="button"
            className="screen-gate-btn"
            onClick={() => (signedIn ? signOut().then(open) : open())}
          >
            {signedIn ? "Ganti akun" : "Sign in admin"}
          </button>
        ) : null}
      </div>
    </main>
  );
}
