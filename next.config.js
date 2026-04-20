/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double-mounting in dev (causes double DB calls)
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};
module.exports = nextConfig;
