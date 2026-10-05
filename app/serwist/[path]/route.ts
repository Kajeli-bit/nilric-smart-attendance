import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  "local";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    swSrc: "app/sw.ts",
    // Vercel blocks some package install scripts, so native `esbuild` is
    // unreliable in their build image. Serwist's Linux default is esbuild-wasm.
    useNativeEsbuild: false,
  });
