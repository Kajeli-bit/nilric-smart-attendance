import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";

const APP_NAME = "Nilric Smart Attendance";
const APP_DEFAULT_TITLE = "Nilric Smart Attendance";
const APP_TITLE_TEMPLATE = "%s - Nilric";
const APP_DESCRIPTION = "Location-based worker check-in and check-out";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
        </SerwistProvider>
      </body>
    </html>
  );
}
