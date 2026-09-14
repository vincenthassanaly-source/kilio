import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://vsmtkopkqasrdnjceegp.supabase.co",
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
