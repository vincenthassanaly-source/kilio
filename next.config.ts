import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Supabase anon/publishable key: safe to expose client-side, data access
    // is governed by Postgres row-level security policies.
    NEXT_PUBLIC_SUPABASE_URL: "https://vsmtkopkqasrdnjceegp.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_bbCMwWsIgq8ZqQCckKhzWw_G27KM6Ov",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vsmtkopkqasrdnjceegp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
