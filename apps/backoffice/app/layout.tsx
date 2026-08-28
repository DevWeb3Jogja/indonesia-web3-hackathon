import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Web3Provider from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "Backoffice IW3H",
  robots: { index: false, follow: false },
};

// Terapkan tema sebelum paint (hindari flash). Server-rendered di <head> →
// tidak kena warning "script in client component" seperti next-themes.
const themeBoot = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: boot tema sebelum paint */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <TooltipProvider>
          <Web3Provider>{children}</Web3Provider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
