import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicSense — Smart campus care",
  description: "Bilingual campus issue management for Dibrugarh University",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
