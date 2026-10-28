"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

interface SignIn {
  /** false → App ID Privy belum diset: tombol login disembunyikan. */
  enabled: boolean;
  /** true selama Privy memuat / menukar token ke session server. */
  busy: boolean;
  error: string | null;
  open: () => void;
  signOut: () => Promise<void>;
}

const noop = async () => {};
const SignInContext = createContext<SignIn>({
  enabled: false,
  busy: false,
  error: null,
  open: () => {},
  signOut: noop,
});

export const useSignIn = () => useContext(SignInContext);

/** Beri tahu VoteApp supaya render ulang server dengan cookie baru. */
const announce = () => window.dispatchEvent(new Event("iw3h:session"));

/**
 * Login penonton via Privy (email / Google / wallet). Setelah Privy login, access
 * token ditukar ke session cookie kita lewat /api/auth/privy — dari situ semua
 * aturan vote di server sama seperti sebelumnya.
 */
export default function SignInProvider({ children }: { children: React.ReactNode }) {
  if (!privyAppId) {
    if (typeof window !== "undefined") {
      console.warn("NEXT_PUBLIC_PRIVY_APP_ID kosong — login nonaktif");
    }
    return <>{children}</>;
  }
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: { theme: "dark", accentColor: "#f2ba2b" },
        // Wallet embedded dibuat SERVER saat tukar token (lihat /api/auth/privy).
        embeddedWallets: { ethereum: { createOnLogin: "off" } },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}

function Bridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Satu kali tukar token per user Privy per muat halaman.
  const exchanged = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user || exchanged.current === user.id) return;
    exchanged.current = user.id;
    setExchanging(true);
    setError(null);
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/auth/privy", {
          method: "POST",
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          exchanged.current = null;
          setError((await res.json().catch(() => null))?.error ?? "Gagal masuk");
          return;
        }
        announce();
      } catch {
        exchanged.current = null;
        setError("Gagal masuk. Periksa koneksi lalu coba lagi.");
      } finally {
        setExchanging(false);
      }
    })();
  }, [ready, authenticated, user, getAccessToken]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    await logout().catch(() => null);
    exchanged.current = null;
    announce();
  }, [logout]);

  return (
    <SignInContext.Provider
      value={{
        enabled: true,
        busy: !ready || exchanging,
        error,
        open: () => login(),
        signOut,
      }}
    >
      {children}
    </SignInContext.Provider>
  );
}
