import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Web3Provider from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "Backoffice IW3H",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>{children}</Web3Provider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
