import type { Metadata } from "next";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "Backoffice IW3H",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
