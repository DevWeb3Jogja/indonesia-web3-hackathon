import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Web3Provider from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "Backoffice IW3H",
  description: "Admin panel for Indonesia Web3 Hackathon 2026.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
