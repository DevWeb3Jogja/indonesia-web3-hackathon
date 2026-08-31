"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

/** HeroUIProvider (template kuma-mieru). Tema tetap pakai class `.dark` yang di-set
 *  themeBoot + theme-toggle bawaan — HeroUI darkMode:'class' ikut kelas itu. */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <HeroUIProvider navigate={router.push}>{children}</HeroUIProvider>;
}
