/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: no `output: "standalone"` — we run a custom server (server.js)
  // for Socket.io, so Next is used in "custom server" mode instead.
  poweredByHeader: false,
  compress: true,
  // Thumbnails come from many external CDNs — allow remote images.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Avoid heavy on-the-fly optimization to save memory.
    unoptimized: true,
  },
  experimental: {
    // Trim server bundle: keep heavy libs external.
    serverComponentsExternalPackages: ["bullmq", "ioredis", "@prisma/client"],
  },
};

module.exports = nextConfig;
