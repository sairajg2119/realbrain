import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Display type: a geometric grotesque, like the reference templates, instead of a serif.
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "RealBrain · The real estate marketing studio",
  description: "Turn a project brochure into data-backed reel scripts and an AI-presenter video, ready for your review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
