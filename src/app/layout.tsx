import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "CivicSense — Smart campus care",
  description: "Bilingual campus issue management for Dibrugarh University",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/newLogo.png",
    apple: "/newLogo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2b8f85",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
