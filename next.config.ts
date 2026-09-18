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
  experimental: {
    serverActions: {
      // Défaut Next.js : 1 Mo, largement dépassé par une photo prise
      // directement avec l'appareil d'un téléphone (souvent 2-5 Mo), ce qui
      // rejette la requête HTTP (413) avant même l'exécution de
      // createTache/uploadTacheImages. 4 Mo laisse de la marge sous la
      // limite dure de Vercel pour les Serverless Functions (4.5 Mo, non
      // configurable) une fois l'overhead multipart pris en compte.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
