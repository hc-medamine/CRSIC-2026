import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow opening the CMS from the LAN (http://172.16.1.37:3000).
  // Next.js 16 blocks dev-only assets/endpoints from any origin other than the
  // one the server initialized with (localhost) - SSR HTML still renders, but
  // /_next chunks 403, React never hydrates, and every button (login bubbles,
  // sign-in, lang toggle) is dead. Ignored by production builds.
  // If the DHCP-assigned IP changes, update this list.
  allowedDevOrigins: ["172.16.1.37"],
};

export default nextConfig;
