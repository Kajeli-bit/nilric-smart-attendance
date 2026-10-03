import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const APP_NAME = "Nilric Smart Attendance";
const APP_DEFAULT_TITLE = "Nilric Smart Attendance";
const APP_TITLE_TEMPLATE = "%s - Nilric";
const APP_DESCRIPTION = "Google SSO location-based worker attendance";
const THEME_COLOR = "#7C48CF";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  // Tab / browser favicon — company logo
  icons: {
    icon: [
      { url: "/icons/favicon.png", type: "image/png" },
      { url: "/icons/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
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
      <head>
        <link rel="icon" href="/icons/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/icons/favicon.png" type="image/png" />
      </head>
      <body className="min-h-screen text-slate-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
