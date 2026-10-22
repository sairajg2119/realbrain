import "./globals.css";
import type { Metadata } from "next";
import { Montserrat, Roboto_Slab } from "next/font/google";

const sans = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const serif = Roboto_Slab({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "RealBrain",
  description: "Upload a project brochure. Get three data-backed reel scripts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
