import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RealBrain",
  description: "Upload a project brochure. Get three data-backed reel scripts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
