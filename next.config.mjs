import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";
const isTauri = process.env.TAURI === "1" || process.env.TAURI === "true";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Desactivar PWA en Tauri para evitar problemas con service workers en esquemas no-HTTP
  disable: isDev || isTauri,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Ejecutaremos con `node .next/standalone/server.js` dentro de Tauri
  output: "standalone",
  generateEtags: false,
  // Skip ESLint during build for production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default pwaConfig(nextConfig);
