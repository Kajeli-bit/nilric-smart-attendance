import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nilric Smart Attendance",
    short_name: "Nilric",
    description: "Location-based worker check-in system",
    start_url: "/check-in",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0F766E",
    icons: [
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
