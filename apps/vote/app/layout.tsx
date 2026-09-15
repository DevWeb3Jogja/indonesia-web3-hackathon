import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import Web3Provider from "@/components/Web3Provider";
import "./globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vote — Indonesia Web3 Hackathon",
  description: "Pilih project favoritmu di demo day Indonesia Web3 Hackathon.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={kanit.variable}>
      <body className="font-sans">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
