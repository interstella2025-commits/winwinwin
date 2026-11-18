import type { NextConfig } from "next";
const noindex = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
];
const config: NextConfig = {
  async headers() {
    return [
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/admin/:path*", headers: noindex },
    ];
  },
};
export default config;
