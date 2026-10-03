import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nilric Smart Attendance",
    short_name: "Nilric",
    description: "Location-based worker check-in system",
    // Open the landing/sign-in page in the installed PWA (not straight into check-in).
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f3ff",
    theme_color: "#7C48CF",
    scope: "/",
    icons: [
      {
        src: "/icons/logo.png",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
